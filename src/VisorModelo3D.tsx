import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds, useGLTF } from '@react-three/drei';
import { ErrorBoundary } from './components/ErrorBoundary';

/**
 * Visor de modelos .glb de las publicaciones.
 *
 * Vive en su propio archivo para poder cargarse con React.lazy desde
 * Landing.tsx: three.js y @react-three pesan cerca de un megabyte, y hasta
 * ahora viajaban en el paquete de entrada de la web pública aunque el visitante
 * no abriera jamás una publicación con modelo 3D.
 *
 * Las dos formas en que se usa solo se diferencian en encuadre e iluminación,
 * así que se resuelven con una variante en lugar de duplicar el visor:
 *
 *   tarjeta      la miniatura dentro de la rejilla de publicaciones
 *   publicacion  el fondo a pantalla completa de una publicación abierta
 */

const VARIANTES = {
  tarjeta: {
    camara: { position: [0, 0, 4] as [number, number, number], fov: 50 },
    ambiental: 0.7,
    direccional: { position: [5, 10, 5] as [number, number, number], intensidad: 1.5 },
    margen: 1.5,
    autoGirar: false,
  },
  publicacion: {
    camara: { position: [0, 0, 5] as [number, number, number], fov: 45 },
    ambiental: 0.5,
    direccional: { position: [10, 10, 10] as [number, number, number], intensidad: 1.2 },
    margen: 1.2,
    autoGirar: true,
  },
};

function Modelo({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function VisorModelo3D({
  url,
  variante = 'tarjeta',
}: {
  url: string;
  variante?: keyof typeof VARIANTES;
}) {
  const v = VARIANTES[variante];

  return (
    <Canvas frameloop="demand" dpr={[1, 1.5]} camera={v.camara}>
      <ambientLight intensity={v.ambiental} />
      <directionalLight position={v.direccional.position} intensity={v.direccional.intensidad} />
      {/* El modelo llega por red: sin este Suspense el lienzo reventaría
          mientras se descarga. Y sin el ErrorBoundary, un archivo que falla
          al parsear (Suspense solo atrapa la espera, no errores de verdad)
          se llevaba por delante todo lo que hubiera encima -- ver
          components/ErrorBoundary.tsx. */}
      <ErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={v.margen}>
            <Modelo url={url} />
          </Bounds>
        </Suspense>
      </ErrorBoundary>
      <OrbitControls
        makeDefault
        enableZoom
        enablePan={false}
        autoRotate={v.autoGirar}
        autoRotateSpeed={2}
      />
    </Canvas>
  );
}
