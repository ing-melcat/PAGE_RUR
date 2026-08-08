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
  nav: {
    inicio: 'HOME',
    explora: 'EXPLORE',
    descubre: 'DISCOVER',
    conecta: 'CONNECT',
    acceder: 'SIGN IN',
    avisoActivo: 'ACTIVE NOTICE',
    eventoActivo: 'ACTIVE EVENT',
  },
  home: {
    heroTitulo: 'The Future of Technology',
    heroTexto: 'Dedicated to advancing robotics technology through hands-on experimentation, collaborative design, and interdisciplinary innovation. Building scalable solutions for industry and academia.',
    seccionTitulo: 'Latest Posts',
    verTodo: 'VIEW ALL →',
  },
  explora: {
    heroTitulo: 'Explore the Unknown',
    heroTexto: 'Dive into the frontier of knowledge. From analog space missions to advanced robotics.',
    seccionTitulo: 'More Exploration News',
  },
  descubre: {
    eyebrow: 'VIRTUAL LAB',
    heroTitulo: '3D Prototypes',
    heroTexto: 'Interact with the three-dimensional models of our developments. Drag to rotate and scroll to zoom.',
    seccionTitulo: 'Lab Logbook',
  },
  conecta: {
    eyebrow: 'GLOBAL PARTNERSHIPS',
    heroTitulo: 'Connect with the World',
    heroTexto: 'Our network of international collaborations drives technological development beyond borders.',
    seccionTitulo: 'Network Updates',
  },
  comingSoon: {
    titulo: 'COMING SOON',
    texto: 'This section is still under development. Stay tuned to our social media for future updates!',
    volver: 'BACK TO HOME',
  },
  footer: {
    contacto: 'CONTACT',
    legal: 'LEGAL',
    avisoPrivacidad: 'Privacy Notice',
    terminos: 'Terms and Conditions',
    cookies: 'Cookie Policy',
    social: 'SOCIAL',
    derechos: 'All rights reserved.',
  },
  countdown: {
    agotado: 'TIME\'S UP!',
    calculando: 'CALCULATING...',
  },
  landing: {
    previewMagazine: 'Special multi-page edition. Click to explore this interactive magazine.',
    revistaMultipagina: 'MULTI-PAGE MAGAZINE',
    avisoImportante: 'IMPORTANT NOTICE',
    eventoEspecial: 'SPECIAL EVENT',
    leerAhora: 'READ NOW →',
  },
  publicacion: {
    volver: '← BACK',
    anterior: '← PREVIOUS',
    pagina: 'PAGE',
    siguiente: 'NEXT →',
    sinContenido: 'No additional content.',
  },
  archivo: {
    titulo: 'Post Archive',
    subtitulo: 'Explore and search all our magazines, articles, notices, and events.',
    buscarPlaceholder: 'Search by title...',
    todos: 'All Types',
    revistas: 'Magazines',
    articulosSimples: 'Simple Articles',
    eventosEspeciales: 'Special Events',
    avisos: 'Notices',
    sinResultados: 'NO POSTS FOUND.',
    previewMagazine: 'Special multi-page edition.',
    revista: 'MAGAZINE',
    aviso: 'NOTICE',
    evento: 'EVENT',
    articulo: 'ARTICLE',
  },
};
