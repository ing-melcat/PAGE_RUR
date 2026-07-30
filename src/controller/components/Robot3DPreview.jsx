import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';

// Modelo 3D cargado desde un archivo .glb
function RealRobotModel({ url, isOffline }) {
  // Para evitar crasheos si el archivo no existe, deberíamos capturar errores,
  // pero useGLTF normalmente se maneja con Suspense.
  const { scene } = useGLTF(url);
  const group = useRef();

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.5;
    }
  });

  // Clona la escena para poder aplicarle materiales si está offline
  // Por simplicidad, solo rotamos. Para desaturar, se tendría que iterar sobre los meshes.

  return (
    <group ref={group} dispose={null} scale={1.5} position={[0, -0.5, 0]}>
      <primitive object={scene} />
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

  const color = "var(--accent)";
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
        
        <Suspense fallback={<PlaceholderRobotModel isOffline={isOffline} />}>
          {useRealModel ? (
            <RealRobotModel url={modelUrl} isOffline={isOffline} />
          ) : (
            <PlaceholderRobotModel isOffline={isOffline} />
          )}
        </Suspense>
        
        <ContactShadows position={[0, -0.6, 0]} opacity={0.5} scale={5} blur={2} far={2} />
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={false} />
      </Canvas>
    </div>
  );
}
