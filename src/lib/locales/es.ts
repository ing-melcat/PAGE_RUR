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
  nav: {
    inicio: 'INICIO',
    explora: 'EXPLORA',
    descubre: 'DESCUBRE',
    conecta: 'CONECTA',
    acceder: 'ACCEDER',
    avisoActivo: 'AVISO ACTIVO',
    eventoActivo: 'EVENTO ACTIVO',
  },
  home: {
    heroTitulo: 'El Futuro de la Tecnología',
    heroTexto: 'Dedicados a avanzar las tecnologías robóticas mediante experimentación práctica, diseño colaborativo e innovación interdisciplinaria. Construyendo soluciones escalables para la industria y academia.',
    seccionTitulo: 'Últimas Publicaciones',
    verTodo: 'VER TODO →',
  },
  explora: {
    heroTitulo: 'Explora lo Desconocido',
    heroTexto: 'Sumérgete en la frontera del conocimiento. Desde misiones análogas espaciales hasta robótica avanzada.',
    seccionTitulo: 'Más Novedades de Exploración',
  },
  descubre: {
    eyebrow: 'LABORATORIO VIRTUAL',
    heroTitulo: 'Prototipos 3D',
    heroTexto: 'Interactúa con los modelos tridimensionales de nuestros desarrollos. Arrastra para rotar y usa el scroll para acercar.',
    seccionTitulo: 'Bitácora del Laboratorio',
  },
  conecta: {
    eyebrow: 'ALIANZAS GLOBALES',
    heroTitulo: 'Conecta con el Mundo',
    heroTexto: 'Nuestra red de colaboraciones internacionales impulsa el desarrollo tecnológico más allá de las fronteras.',
    seccionTitulo: 'Actualizaciones de la Red',
  },
  comingSoon: {
    titulo: 'PROXIMAMENTE',
    texto: 'Esta sección aún está en desarrollo. ¡Mantente atento a nuestras redes para futuras actualizaciones!',
    volver: 'VOLVER AL INICIO',
  },
  footer: {
    contacto: 'CONTACTO',
    legal: 'LEGAL',
    avisoPrivacidad: 'Aviso de Privacidad',
    terminos: 'Términos y Condiciones',
    cookies: 'Política de Cookies',
    social: 'SOCIAL',
    derechos: 'Todos los derechos reservados.',
  },
};

export type Dictionary = typeof es;
