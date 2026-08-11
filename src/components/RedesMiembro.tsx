/**
 * Los enlaces de contacto de un miembro.
 *
 * Solo redes: nada de teléfono ni correo. Cada quien pone las que quiere en
 * su perfil y son las únicas que salen; quien no ponga ninguna, no muestra
 * fila de iconos en vez de mostrar huecos vacíos.
 *
 * Los iconos van como SVG aquí dentro porque lucide dejó de traer marcas en
 * la versión 1. Se reconocen de un vistazo, que es justo lo que un texto
 * ("gh", "in") no consigue.
 */

type Redes = {
  github?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  reddit?: string;
};

// Cada entrada: cómo se llama, cómo se completa un valor suelto hasta URL, y
// su trazo. El campo se rellenó a mano durante años, así que conviven
// 'Ing-melcat' y la URL entera: se acepta cualquiera de las dos formas en
// lugar de enseñar un enlace roto a quien escribió solo su usuario.
const REDES: Record<keyof Redes, { nombre: string; base: string; path: string }> = {
  linkedin: {
    nombre: 'LinkedIn',
    base: 'https://www.linkedin.com/in/',
    path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z',
  },
  github: {
    nombre: 'GitHub',
    base: 'https://github.com/',
    path: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3z',
  },
  instagram: {
    nombre: 'Instagram',
    base: 'https://instagram.com/',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07c-1.28.06-2.15.26-2.91.56-.79.3-1.46.72-2.13 1.38A5.9 5.9 0 0 0 .63 4.14c-.3.76-.5 1.63-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.28.26 2.15.56 2.91.3.79.72 1.46 1.38 2.13a5.9 5.9 0 0 0 2.13 1.38c.76.3 1.63.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.28-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.38 5.9 5.9 0 0 0 1.38-2.13c.3-.76.5-1.63.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.28-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.38-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.63-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z',
  },
  facebook: {
    nombre: 'Facebook',
    base: 'https://facebook.com/',
    path: 'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z',
  },
  reddit: {
    nombre: 'Reddit',
    base: 'https://reddit.com/user/',
    path: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.74c.69 0 1.25.56 1.25 1.25a1.25 1.25 0 0 1-2.5.06l-2.6-.55-.8 3.75c1.83.09 3.48.65 4.68 1.48.3-.29.71-.47 1.15-.47.94 0 1.7.77 1.7 1.71 0 .69-.41 1.28-1 1.55a3.3 3.3 0 0 1 .05.57c0 2.9-3.37 5.25-7.53 5.25s-7.53-2.35-7.53-5.25c0-.2.02-.39.05-.58a1.7 1.7 0 0 1-.98-1.54c0-.94.76-1.7 1.7-1.7.44 0 .84.17 1.13.45 1.21-.83 2.87-1.39 4.72-1.47l.89-4.19a.42.42 0 0 1 .5-.32l2.96.63a1.25 1.25 0 0 1 1.16-.78zM9.25 12.5a1.25 1.25 0 0 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm5.5 0a1.25 1.25 0 0 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm-5.47 4.68a.32.32 0 0 0-.14.55c.9.9 2.56.97 3.05.97.49 0 2.15-.07 3.05-.97a.32.32 0 0 0-.22-.55.33.33 0 0 0-.23.09c-.57.57-1.78.77-2.6.77-.82 0-2.03-.2-2.6-.77a.33.33 0 0 0-.31-.09z',
  },
};

function completar(base: string, valor: string) {
  const v = valor.trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return base + v.replace(/^@/, '');
}

export function RedesMiembro({ redes, nombre }: { redes: Redes; nombre: string }) {
  const puestas = (Object.keys(REDES) as (keyof Redes)[])
    .filter((k) => redes?.[k])
    .map((k) => ({ clave: k, ...REDES[k], url: completar(REDES[k].base, redes[k]!) }));

  if (puestas.length === 0) return null;

  return (
    <div className="miembro__redes">
      {puestas.map((r) => (
        <a
          key={r.clave}
          href={r.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${r.nombre} de ${nombre}`}
          title={r.nombre}
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
            <path d={r.path} />
          </svg>
        </a>
      ))}
    </div>
  );
}
