// Envoltorio del hilo principal para comprimirModelo3D.worker.ts -- ver ese
// archivo para el porqué. Aquí solo se manda el archivo, se espera la
// respuesta y se cierra el worker; el trabajo de verdad vive del otro lado.
import ModeloWorker from './comprimirModelo3D.worker?worker';

export type ResultadoCompresion = {
  archivo: File;
  originalSize: number;
  compressedSize: number;
};

export function comprimirModelo3D(archivo: File): Promise<ResultadoCompresion> {
  return new Promise((resolve, reject) => {
    const worker = new ModeloWorker();

    worker.onmessage = (e: MessageEvent<any>) => {
      worker.terminate();
      const datos = e.data;
      if (datos.ok) {
        // Siempre .glb de salida, igual que el servidor: un .gltf trae
        // texturas y binarios en archivos sueltos al lado, y aquí solo se
        // conserva el propio archivo que se subió.
        const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.glb';
        resolve({
          archivo: new File([datos.buffer], nombre, { type: 'model/gltf-binary' }),
          originalSize: datos.originalSize,
          compressedSize: datos.compressedSize,
        });
      } else {
        reject(new Error(datos.error));
      }
    };

    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Error desconocido comprimiendo el modelo.'));
    };

    archivo.arrayBuffer().then((buffer) => {
      worker.postMessage({ buffer }, [buffer]);
    });
  });
}
