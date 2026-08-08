import type { Dictionary } from './es';

// Traducción al inglés. Debe mantener exactamente la misma forma que `es`
// (mismas secciones, mismas claves) -- TypeScript avisa en build si una
// clave falta o sobra, gracias al tipo `Dictionary` importado de es.ts.
export const en: Dictionary = {
  accesibilidad: {
    idioma: 'Language',
    idiomaDescripcion: 'Changes the language of the whole interface. Post content is translated separately.',
    espanol: 'Spanish',
    ingles: 'English',
  },
};
