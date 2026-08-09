import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { NIVEL_MAX } from '../telemetria';

/**
 * El RASSOR reaccionando a los mandos del operador, sin escenario.
 *
 * Empezó siendo una vista cenital con rejilla de suelo, al estilo de la cámara
 * 360 de un coche. Se quitó: la rejilla se recortaba contra los bordes del
 * lienzo y metía un mundo imaginario compitiendo con el vídeo real que hay
 * detrás. Un instrumento del HUD no debe traer su propio entorno.
 *
 * El robot se queda QUIETO y la cámara mira casi a plomo, como la vista de
 * aparcamiento de un coche. Toda la lectura de movimiento la llevan las
 * **guías de trayectoria**: dos líneas ámbar que salen del frente y se curvan
 * con el giro, diciendo dónde va a acabar la máquina y no solo hacia dónde
 * apunta.
 *
 * Hubo una versión en la que el robot rotaba con el mando. Se quitó: sin suelo
 * ni paisaje alrededor, una carrocería girando sobre sí misma no informa de
 * nada y marea. La referencia tiene que estar fija para que las guías
 * signifiquen algo.
 *
 * Lo único que llega a mover el modelo es la inclinación medida por una IMU,
 * el día que exista. Eso no es animación: es el terreno.
 */

// El modelo REAL del robot, exportado del CAD. Es un STL, con lo que eso
// implica: geometría y nada más — sin materiales, sin colores y con normales
// planas. Todo el aspecto se lo da esta interfaz, y las
// normales se recalculan al vuelo para que las superficies curvas dejen de
// verse facetadas.
//
// La alternativa era el GLB de la NASA (/models/rassor.glb), que sí trae
// materiales y malla ligera, pero no es esta máquina.
const MODELO_STL = '/models/rassor-real.stl';

// Los STL de CAD vienen en milímetros y sin centrar: 479 × 455 × 262 mm. Se
// normaliza al vuelo para que el robot mida ~1.6 de largo, que es la escala
// en la que están pensadas la cámara y las guías.
const LARGO_OBJETIVO = 1.66;

// Por debajo de este ángulo el robot no se inclina: es ruido de sensor, no
// terreno. Y del que lo supera se representa esta fracción — lo justo para que
// la pendiente se perciba sin que el modelo baile.
const UMBRAL_GRADOS = 2.5;
const COMPRESION = 0.55;
const CENTRO_Z = 0;


/** Nivel con signo en -1..1. Adelante y derecha, positivos. */
function conSigno(bloque, negativo) {
  if (!bloque?.nivel) return 0;
  return ((bloque.dir === negativo ? -1 : 1) * bloque.nivel) / NIVEL_MAX;
}

/**
 * Sombra de contacto bajo el robot.
 *
 * Antes era un círculo plano con opacidad fija, y sobre un fondo claro se veía
 * exactamente como lo que era: un disco negro pegado bajo la máquina. Una
 * sombra de verdad no tiene borde — se difumina con la distancia y toma la
 * forma de lo que la proyecta.
 *
 * ContactShadows la calcula a partir de la propia geometría, así que sigue el
 * contorno del chasis y los tambores. `far` corta a poco más de la altura del
 * robot: sin ese límite, cualquier pieza alta ensuciaría el suelo con una
 * mancha que no le corresponde.
 */
function SombraApoyo() {
  return (
    <ContactShadows
      position={[0, 0.001, 0]}
      scale={3.2}
      far={1.1}
      blur={2.6}
      opacity={0.5}
      // Suficiente para una sombra difusa a este tamaño; más resolución solo
      // gastaría memoria de vídeo en un instrumento de 150 píxeles.
      resolution={256}
      color="#000000"
    />
  );
}

/**
 * Guías de trayectoria, como las de la cámara de marcha atrás de un coche:
 * dos líneas paralelas al ancho del robot que se curvan según el giro.
 *
 * Se dibujan solo cuando hay avance. Con el robot parado no hay trayectoria
 * que anticipar, y unas guías fijas apuntando al vacío sugerirían movimiento
 * donde no lo hay.
 */
function Guias({ avance, giro }) {
  const izquierda = useRef();
  const derecha = useRef();
  const grupo = useRef();

  const geometrias = useMemo(() => [
    new THREE.BufferGeometry(),
    new THREE.BufferGeometry(),
  ], []);

  useFrame(() => {
    const y = conSigno(avance, 'atras');
    const x = conSigno(giro, 'izquierda');

    // Sin rejilla, las guías son lo único que cuenta el movimiento: también
    // se muestran girando sobre el eje, donde antes bastaba con ver rotar el
    // suelo.
    const hayMando = Math.abs(y) > 0.01 || Math.abs(x) > 0.01;
    if (grupo.current) grupo.current.visible = hayMando;
    if (!hayMando) return;

    // Arco de circunferencia: cuanto más giro, más cerrado. Con el mando
    // centrado el radio tiende a infinito, así que la guía sale recta.
    const largo = 1.2 + Math.max(Math.abs(y), Math.abs(x) * 0.5) * 2.2;
    const curvatura = x * 0.9;
    const signo = Math.sign(y) || 1;   // girando en parado, las guías van al frente

    [[-0.42, izquierda], [0.42, derecha]].forEach(([offset, ref], i) => {
      const puntos = [];
      for (let p = 0; p <= 16; p++) {
        const t = (p / 16) * largo;
        const ang = curvatura * t * 0.5;
        puntos.push(new THREE.Vector3(
          offset * Math.cos(ang) + Math.sin(ang) * t * signo,
          0.02,
          (offset * Math.sin(ang) - Math.cos(ang) * t) * signo + CENTRO_Z,
        ));
      }
      geometrias[i].setFromPoints(puntos);
      if (ref.current) ref.current.geometry = geometrias[i];
    });
  });

  return (
    <group ref={grupo}>
      <line ref={izquierda}>
        <bufferGeometry />
        <lineBasicMaterial color="#FBCA01" transparent opacity={0.75} />
      </line>
      <line ref={derecha}>
        <bufferGeometry />
        <lineBasicMaterial color="#FBCA01" transparent opacity={0.75} />
      </line>
    </group>
  );
}

function Modelo({ imu }) {
  const grupo = useRef();
  const geometria = useLoader(STLLoader, MODELO_STL);

  // Centrado, apoyo en el suelo y escala, calculados de la propia malla en vez
  // de con números a mano: si mañana se exporta otra versión del CAD, el
  // instrumento sigue encuadrando igual sin tocar código.
  const { escalaModelo, desplazamiento } = useMemo(() => {
    // Se orienta ANTES de medir. El CAD exporta con Z hacia arriba y three.js
    // usa Y: si se midiera primero y se rotara después, el "apoyo en el suelo"
    // estaría calculado sobre un eje que ya no es el vertical, y el robot
    // saldría flotando o enterrado.
    //
    // useLoader cachea la geometría entre montajes, así que la marca evita
    // rotarla dos veces y dejar el modelo de lado al volver a la página.
    if (!geometria.userData.orientado) {
      geometria.rotateX(-Math.PI / 2);
      geometria.userData.orientado = true;
    }
    geometria.computeVertexNormals();   // el STL trae normales planas
    geometria.computeBoundingBox();
    const caja = geometria.boundingBox;
    const tam = new THREE.Vector3();
    caja.getSize(tam);
    const centro = new THREE.Vector3();
    caja.getCenter(centro);
    const k = LARGO_OBJETIVO / Math.max(tam.x, tam.y, tam.z);
    return {
      escalaModelo: k,
      // Centrado en X/Z y apoyado sobre el suelo en Y.
      desplazamiento: [-centro.x * k, -caja.min.y * k, -centro.z * k],
    };
  }, [geometria]);

  useFrame((_e, delta) => {
    if (!grupo.current) return;

    // EL ROBOT NO GIRA. Es la referencia fija de la vista, igual que el coche
    // en la cámara 360 de un aparcamiento: quien cuenta hacia dónde va son las
    // guías, no la carrocería dando vueltas. Un modelo rotando sin suelo ni
    // paisaje alrededor no informaba de nada y mareaba.
    //
    // Lo único que puede moverlo es la INCLINACIÓN MEDIDA por una IMU: eso no
    // es animación, es el terreno. Sin IMU se queda quieto, porque inventarle
    // un balanceo sería afirmar una pendiente que nadie ha medido.
    //
    // Pero "tener el dato" no es motivo para moverse a cada instante. Una IMU
    // entrega ruido constante de un par de grados aunque la máquina esté
    // parada en llano, y un modelo que se mece sin parar en un rincón de la
    // pantalla roba atención todo el rato sin informar de nada. Dos filtros lo
    // evitan:
    //
    //   ZONA MUERTA — por debajo de UMBRAL_GRADOS el robot se queda plano. Es
    //   la diferencia entre "hay una pendiente" y "el sensor tiembla".
    //
    //   COMPRESIÓN — se representa una fracción del ángulo real. El objetivo
    //   no es medir la pendiente en pantalla (para eso está el instrumento de
    //   inclinación, con su cifra), sino que se note que la hay.
    const filtrar = (grados) => {
      if (grados == null || Math.abs(grados) < UMBRAL_GRADOS) return 0;
      return ((grados - Math.sign(grados) * UMBRAL_GRADOS) * COMPRESION * Math.PI) / 180;
    };

    const pitch = -filtrar(imu?.pitch);
    const roll = filtrar(imu?.roll);

    // Asentamiento lento: la máquina tiene masa. A delta*6 el modelo seguía
    // cada paquete de telemetría casi al instante y el resultado era un
    // temblor a 10 Hz; a delta*1.8 tarda algo menos de un segundo en acomodarse
    // y se lee como un vehículo pesado inclinándose, no como un dato saltando.
    grupo.current.rotation.x += (pitch - grupo.current.rotation.x) * Math.min(1, delta * 1.8);
    grupo.current.rotation.z += (roll - grupo.current.rotation.z) * Math.min(1, delta * 1.8);
  });

  return (
    <group ref={grupo} dispose={null}>
      {/* El STL viene tumbado respecto de la convención de la escena: el CAD
          usa Z arriba y three.js usa Y arriba. */}
      <mesh geometry={geometria} scale={escalaModelo} position={desplazamiento}>
        {/* Metal oscuro con un punto de calidez: se despega del navy del HUD
            sin competir con el ámbar, que aquí lo llevan las guías. */}
        <meshStandardMaterial color="#c8ccd4" metalness={0.65} roughness={0.38} />
      </mesh>
    </group>
  );
}

export function RassorEnVivo({ avance, giro, imu, escala = 1 }) {
  return (
    <div className="hud__robot3d" style={{ width: 200 * escala, height: 120 * escala }}>
      <Canvas
        // Casi cenital. La vista desde arriba es la que deja leer de un
        // vistazo hacia dónde apuntan las guías; el poco ángulo que queda es
        // solo para que el robot no se lea como una mancha plana.
        camera={{ position: [0, 3.2, 0.95], fov: 34 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <ambientLight intensity={1} />
        <directionalLight position={[2, 6, 3]} intensity={1.5} />
        <directionalLight position={[-3, 2, -2]} intensity={0.45} color="#8ab4ff" />

        <SombraApoyo />
        <Guias avance={avance} giro={giro} />
        <Suspense fallback={null}>
          <Modelo imu={imu} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// 7 MB y 148.682 triángulos: mejor que empiecen a bajar mientras el
// espectador mira el vídeo y no cuando el instrumento ya debería estar
// dibujándose.
useLoader.preload(STLLoader, MODELO_STL);
