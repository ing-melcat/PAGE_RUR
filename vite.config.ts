import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Sin esto, el minificador reescribe TODAS las media queries a la
    // sintaxis de Media Queries nivel 4 —`@media (width<=768px)` en vez de
    // `@media (max-width:768px)`—, que es equivalente pero solo la entienden
    // Chrome 104+, Safari 16.4+ y Firefox 102+. Un navegador anterior no la
    // interpreta mal: descarta el bloque entero. O sea, en un iPhone con iOS
    // 16.3 el sitio se veía con el diseño de escritorio, sin ninguna de las
    // 12 reglas responsive, y sin ningún error que lo delatara.
    //
    // safari14 es el objetivo más antiguo que cubre los móviles reales que
    // se ven en la universidad sin renunciar a nada que el sitio use.
    cssTarget: 'safari14',
    rollupOptions: {
      // @pmndrs/xr (usado por @react-three/xr) trae de fábrica un emulador
      // de visor para desarrollo local (iwer/@iwer/sem/@iwer/devui), cargado
      // por un import() dinámico que solo se ejecuta si el store se crea con
      // `emulate` distinto de `false` (ver createXRStore en VRConsole.jsx,
      // donde se pasa `emulate: false` a propósito). @iwer/sem trae código
      // generado que importa `@bufbuild/protobuf@2` sin declararlo como
      // dependencia propia, y el proyecto ya depende de LiveKit con
      // `@bufbuild/protobuf@1` -- forzar una sola versión rompería a
      // cualquiera de los dos en tiempo de ejecución. Como esa rama nunca se
      // ejecuta aquí, se excluye del bundle en vez de arrastrar el
      // conflicto: el import roto queda en el chunk, pero ese chunk nunca se
      // pide porque nunca se dispara.
      external: ['iwer', '@iwer/sem', '@iwer/devui'],
    },
  },
})
