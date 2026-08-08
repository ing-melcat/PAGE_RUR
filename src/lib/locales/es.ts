// Diccionario base (español). Es el idioma nativo del sitio: estas cadenas
// son las que ya existían escritas a mano en el JSX antes del selector de
// idioma. Se va llenando sección por sección, archivo por archivo, según
// el plan de traducción -- no todas las claves usadas en el código existen
// aquí todavía hasta terminar ese barrido.
export const es = {
  accesibilidad: {
    idioma: 'Idioma',
    idiomaDescripcion: 'Cambia el idioma de toda la interfaz. El contenido de las publicaciones se traduce aparte.',
    espanol: 'Español',
    ingles: 'Inglés',
  },
};

export type Dictionary = typeof es;
