// Comprime un .glb dentro del propio navegador, antes de subirlo.
//
// Mismo pipeline que services/content/server.js (función comprimirModelo):
// dedup + prune + join + weld + simplify (solo si la malla es extrema) +
// textureCompress a WebP + quantize + meshopt. La diferencia es DÓNDE corre
// y POR QUÉ. Ahí sirve para no servir el archivo pesado a cada visitante;
// aquí es para que lo que sale del navegador ya sea pequeño -- un modelo de
// 300 MB tarda tanto en subir desde una conexión inestable que cualquier
// hipo de red corta la subida a medio camino (Caddy lo registra como
// "stream error ... CANCEL" a los 16-30s, mucho antes de que un archivo así
// pudiera terminar). Comprimiendo primero, lo que viaja son decenas de MB,
// no cientos, y esa subida corta rara vez se corta.
//
// Corre en un worker aparte y no en el hilo principal: comprimir un modelo
// grande satura la CPU varios segundos, y hacerlo en el hilo de la UI
// congelaría la pestaña entera mientras dura.
//
// El "encoder" de sharp que usa el servidor para las texturas no existe en
// el navegador (son bindings nativas de Node) -- por eso aquí textureCompress
// va SIN encoder. gltf-transform trae para ese caso un codificador de
// reserva pensado justo para esto (ndarray-pixels + OffscreenCanvas), no un
// no-op: sigue redimensionando y recodificando a WebP de verdad, solo sin
// los parámetros de calidad/esfuerzo que solo sharp entiende.
//
// Los imports pesados van con import() dinámico, no arriba del archivo: el
// build de este worker usa formato IIFE por defecto (no se tocó
// vite.config.ts para no afectar al resto del bundle), que no admite
// `import` estático de un módulo ESM -- pero sí admite import() dinámico,
// que funciona igual en cualquier formato.

type MensajeEntrada = { buffer: ArrayBuffer };
type MensajeSalida =
  | { tipo: 'progreso'; fraccion: number }
  | { tipo: 'listo'; ok: true; buffer: ArrayBuffer; originalSize: number; compressedSize: number }
  | { tipo: 'listo'; ok: false; error: string };

// `self` en este archivo resuelve al tipo de Window (lib DOM del proyecto,
// no WebWorker) porque tsconfig.app.json no declara la lib "webworker" --
// añadirla aquí chocaría con los globals de DOM que ya trae el resto del
// proyecto. postMessage/onmessage cruzan la frontera del worker de por sí
// sin tipos (lo que viaja es lo que el otro lado decida leer), así que un
// `any` acotado a esta única frontera no es un atajo real: es donde
// TypeScript deja de poder ayudar de verdad.
const contexto = self as any;

// Por defecto NO se simplifica la malla -- reduce el número de triángulos y
// eso sí se ve, así que si un modelo pesa es porque quien lo publica quiso
// ese nivel de detalle. Excepción: un modelo "recuperado" subido en agosto
// de 2026 resultó tener 9,2 millones de vértices y NINGUNA textura -- un
// escaneo en crudo, no algo pensado para tiempo real. Cuantizar y comprimir
// con meshopt no bajan ese número, solo lo hacen más liviano en bytes, así
// que el navegador seguía intentando procesar los mismos 9,2 millones de
// vértices en cada visita, y sin ningún ErrorBoundary en el proyecto (ver
// components/ErrorBoundary.tsx) el fallo se llevaba la tarjeta entera por
// delante -- de ahí que saliera en blanco. El objetivo es generoso a
// propósito: muy por encima de cualquier modelo de robot modelado a mano,
// así que esto no debe notarse en ningún archivo publicado hasta ahora.
const VERTICES_MAXIMOS_SIN_SIMPLIFICAR = 500_000;
const VERTICES_OBJETIVO_SIMPLIFICADO = 150_000;

function contarVertices(documento: any): number {
  let total = 0;
  for (const mesh of documento.getRoot().listMeshes()) {
    for (const primitiva of mesh.listPrimitives()) {
      const posiciones = primitiva.getAttribute('POSITION');
      if (posiciones) total += posiciones.getCount();
    }
  }
  return total;
}

contexto.onmessage = async (e: MessageEvent<MensajeEntrada>) => {
  // 4 pasos fijos + 1 hueco para simplify (se cuenta pase lo que pase,
  // simplifique o no, para que la barra llegue igual al 100%) + 3 pasos
  // fijos más.
  const TOTAL_PASOS = 8;
  let pasoActual = 0;
  const avisarProgreso = (fraccion: number) => {
    const mensaje: MensajeSalida = { tipo: 'progreso', fraccion };
    contexto.postMessage(mensaje);
  };
  const avanzar = () => {
    pasoActual++;
    avisarProgreso(pasoActual / TOTAL_PASOS);
  };

  try {
    const [
      { WebIO },
      { ALL_EXTENSIONS },
      { dedup, prune, join, weld, quantize, meshopt, textureCompress, simplify },
      { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier },
    ] = await Promise.all([
      import('@gltf-transform/core'),
      import('@gltf-transform/extensions'),
      import('@gltf-transform/functions'),
      import('meshoptimizer'),
    ]);

    const io = new WebIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
      'meshopt.encoder': MeshoptEncoder,
    });

    const original = new Uint8Array(e.data.buffer);
    const documento = await io.readBinary(original);

    avisarProgreso(0);
    await documento.transform(dedup());
    avanzar();
    await documento.transform(prune());
    avanzar();
    // keepNamed: los modelos aquí son robots, y sus piezas vienen como nodos
    // con nombre (brazo, rueda, cazo). Fusionarlas sin nombre se llevaría por
    // delante esa estructura -- misma decisión que en comprimirModelo del
    // servidor, por el mismo motivo.
    await documento.transform(join({ keepNamed: true }));
    avanzar();
    await documento.transform(weld());
    avanzar();

    // Después de weld() para contar sobre la malla ya deduplicada, y antes
    // de cuantizar: simplify() trabaja sobre la geometría todavía en
    // float32.
    const vertices = contarVertices(documento);
    if (vertices > VERTICES_MAXIMOS_SIN_SIMPLIFICAR) {
      const ratio = VERTICES_OBJETIVO_SIMPLIFICADO / vertices;
      await documento.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.01 }));
    }
    avanzar();

    await documento.transform(textureCompress({ targetFormat: 'webp', resize: [2048, 2048] }));
    avanzar();
    await documento.transform(quantize());
    avanzar();
    await documento.transform(meshopt({ encoder: MeshoptEncoder }));
    avanzar();

    const comprimido = await io.writeBinary(documento);
    // .slice() y no el Uint8Array tal cual: da un ArrayBuffer propio, del
    // tamaño exacto, que se puede pasar como transferable sin arrastrar
    // memoria de más ni referencias que el hilo principal no debería tocar.
    const salida = comprimido.buffer.slice(
      comprimido.byteOffset,
      comprimido.byteOffset + comprimido.byteLength
    ) as ArrayBuffer;

    const mensaje: MensajeSalida = {
      tipo: 'listo',
      ok: true,
      buffer: salida,
      originalSize: original.byteLength,
      compressedSize: comprimido.byteLength,
    };
    contexto.postMessage(mensaje, [salida]);
  } catch (err: any) {
    const mensaje: MensajeSalida = { tipo: 'listo', ok: false, error: err?.message || String(err) };
    contexto.postMessage(mensaje);
  }
};
