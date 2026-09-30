import React, { useRef, Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF, Bounds } from '@react-three/drei';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Modelo 3D cargado desde un archivo .glb
function RealRobotModel({ url, isOffline }) {
  const { scene } = useGLTF(url);
  const group = useRef();

  const clonedScene = useMemo(() => {
    const s = scene.clone();
    const materialColor = isOffline ? "#555555" : "#FFFFFF";
    s.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: materialColor,
          roughness: 0.4,
          metalness: 0.1
        });
      }
    });
    return s;
  }, [scene, isOffline]);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={group} dispose={null} position={[0, -0.5, 0]}>
      <Bounds fit clip observe margin={1.5}>
        <primitive object={clonedScene} />
      </Bounds>
    </group>
  );
}

// Este componente representa el modelo 3D ensamblado con primitivas (Fallback)
function PlaceholderRobotModel({ isOffline }) {
  const group = useRef();

  // Animación de rotación lenta continua
  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  // Literal y no var(--accent): three.js no resuelve variables CSS, descarta el
  // valor y cae a blanco. Por eso la vista previa nunca salió en ámbar, y de
  // ahí el aviso "Unknown color model var(--accent)" en la consola.
  const color = "#FFFFFF";
  const materialColor = isOffline ? "#555555" : color;

  return (
    <group ref={group} dispose={null} scale={1.5} position={[0, -0.5, 0]}>
      {/* Cuerpo principal */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1, 0.4, 0.6]} />
        <meshStandardMaterial color={materialColor} wireframe={true} />
      </mesh>
      
      {/* Brazos/Tambores Izquierdos */}
      <mesh position={[-0.6, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color={materialColor} />
      </mesh>
      
      {/* Brazos/Tambores Derechos */}
      <mesh position={[0.6, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
        <meshStandardMaterial color={materialColor} />
      </mesh>
    </group>
  );
}

export function Robot3DPreview({ status, modelUrl }) {
  const isOffline = status === 'offline';
  
  // Determinamos si usar el modelo real o el placeholder
  // En este sandbox asumimos que si el modelUrl es un placeholder, usamos las primitivas
  const useRealModel = modelUrl && !modelUrl.includes('placeholder');

  return (
    <div style={{ width: '100%', height: '180px', borderRadius: '8px', overflow: 'hidden', background: 'var(--surface-strong)', position: 'relative', border: '1px solid var(--border)' }}>
      <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }}>
        <ambientLight intensity={isOffline ? 0.2 : 0.7} />
        <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={isOffline ? 0.5 : 1} />
        {/* Relleno tenue desde el lado opuesto: sustituye el brillo que daba
            Environment sin depender de una textura de red. */}
        <pointLight position={[-4, 2, -4]} intensity={isOffline ? 0.3 : 0.6} />

        {/* Sin esto, un modelo que falla al parsear (uno corrupto, uno
            demasiado pesado para la memoria del navegador) se llevaba la
            tarjeta entera por delante -- Suspense atrapa la ESPERA, no
            errores de verdad. Ver components/ErrorBoundary.tsx. */}
        <ErrorBoundary fallback={<PlaceholderRobotModel isOffline={isOffline} />}>
          <Suspense fallback={<PlaceholderRobotModel isOffline={isOffline} />}>
            {useRealModel ? (
              <RealRobotModel url={modelUrl} isOffline={isOffline} />
            ) : (
              <PlaceholderRobotModel isOffline={isOffline} />
            )}
          </Suspense>
        </ErrorBoundary>

        <ContactShadows position={[0, -0.6, 0]} opacity={0.5} scale={5} blur={2} far={2} />
        {/* Sin <Environment preset="city" />: descargaba un mapa de iluminación
            HDR desde un CDN externo en cada tarjeta que se dibujaba. Si esa
            descarga fallaba, lanzaba un error real que Suspense no atrapa (solo
            atrapa promesas, no errores) y que, sin ningún ErrorBoundary en todo
            el proyecto, se llevaba la aplicación entera por delante: la pantalla
            se veía un instante y luego desaparecía sin ningún rastro. */}
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}
