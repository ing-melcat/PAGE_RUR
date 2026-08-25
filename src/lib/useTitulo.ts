import { useEffect } from 'react';

// Todas las rutas públicas devolvían el mismo <title> del index.html --
// pestañas indistinguibles entre sí y sin nada útil que leer en el
// historial del navegador. Cada página pública llama a esto con su propio
// nombre.
//
// A propósito NO restaura el título anterior al desmontarse: las
// transiciones de página (AnimatePresence en App.tsx) montan la página
// nueva antes de que la vieja termine su animación de salida y se
// desmonte, así que un cleanup aquí pisaría el título recién puesto por la
// página nueva con el de la que se está yendo.
export function useTitulo(titulo: string | undefined | null) {
  useEffect(() => {
    if (!titulo) return;
    document.title = `${titulo} | RUR`;
  }, [titulo]);
}
