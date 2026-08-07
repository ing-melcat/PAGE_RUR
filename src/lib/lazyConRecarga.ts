import React from 'react';

/**
 * React.lazy con recuperación cuando el trozo de código no se puede descargar.
 *
 * El caso real que motiva esto: el navegador conserva un index.html viejo, que
 * pide archivos de una release que ya rotó. El import falla, y como React no
 * tiene dónde agarrarse, desmonta la aplicación entera y deja la pantalla en
 * blanco sin explicar nada. Al usuario le parece que el sitio se rompió.
 *
 * Recargar resuelve el problema de raíz, porque index.html se sirve con
 * no-cache y el navegador se trae el shell nuevo con los nombres correctos.
 *
 * La marca en sessionStorage evita el bucle: si tras recargar sigue fallando,
 * el fallo es otro y hay que dejar que se vea en vez de recargar sin parar.
 */

const MARCA = 'rur.recarga-por-modulo';

export function lazyConRecarga<T extends React.ComponentType<any>>(
  importar: () => Promise<{ default: T }>
) {
  return React.lazy(() =>
    importar().catch((error) => {
      if (!sessionStorage.getItem(MARCA)) {
        sessionStorage.setItem(MARCA, '1');
        window.location.reload();
      }
      throw error;
    })
  );
}

/**
 * Se llama una vez que la aplicación ha arrancado bien: a partir de ahí, un
 * fallo futuro vuelve a tener derecho a su recarga.
 */
export function marcarArranqueCorrecto() {
  sessionStorage.removeItem(MARCA);
}
