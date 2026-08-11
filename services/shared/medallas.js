/**
 * Las medallas de una persona.
 *
 * Se separan por naturaleza, que es lo que decide si se calculan o se otorgan:
 *
 *   - Las AUTOMÁTICAS salen de los datos. Están ahí, no hay que mantenerlas,
 *     no se pueden regalar y no se olvida de dárselas a nadie. Nadie las
 *     concede: se cumplen o no se cumplen.
 *   - Las ESPECIALES son un juicio, y por eso las otorga la coordinación. No
 *     hay número que represente "excelencia" ni "mentoría", y fabricar uno las
 *     volvería mentira. A cambio se guarda quién las dio y por qué: alguien
 *     pone su nombre detrás, y eso es lo que impide que se repartan a la
 *     ligera.
 *
 * Las automáticas no se guardan en ninguna parte: se deducen cada vez que se
 * pide el perfil. Aparecen solas cuando se cumplen y desaparecen si el
 * proyecto que las sostenía deja de estar publicado, que es lo correcto — una
 * medalla por algo que ya no existe es una medalla falsa.
 *
 * El riesgo de un sistema así no es que falten medallas: es la inflación. Si
 * todo el mundo las tiene todas, dejan de significar algo y pasan a estorbar
 * en cada tarjeta. Por eso los umbrales de las automáticas son altos y las
 * especiales son pocas y no se solapan entre sí — cada una premia algo que
 * ninguna otra premia.
 */

// Se cumplen solas, a partir de los proyectos firmados.
export const MEDALLAS_AUTOMATICAS = {
  proyecto: {
    nombre: 'Proyecto terminado',
    descripcion: 'Firmó al menos un proyecto publicado.',
  },
  aportes: {
    nombre: 'Grandes aportes',
    descripcion: 'Cinco proyectos o más, o trabajo en tres facetas distintas.',
  },
  lider: {
    nombre: 'Líder',
    descripcion: 'Lideró al menos un proyecto.',
  },
};

// Las otorga la coordinación desde el panel, con un motivo escrito.
//
// La descripción es el criterio, y está aquí para que se lea al concederla:
// es lo que evita que la misma medalla acabe significando cosas distintas
// según quién la dé.
export const MEDALLAS_ESPECIALES = {
  excelencia: {
    nombre: 'Excelencia',
    descripcion: 'Trayectoria sostenida por encima de lo que se le pidió.',
  },
  innovacion: {
    nombre: 'Innovación',
    descripcion: 'Resolvió algo que en la unidad no existía o nadie había logrado.',
  },
  mentoria: {
    nombre: 'Mentoría',
    descripcion: 'Formó a otros miembros y los dejó capaces de seguir solos.',
  },
  representacion: {
    nombre: 'Representación',
    descripcion: 'Representó a la unidad fuera: competencia, congreso o convenio.',
  },
};

// Todas juntas, para resolver una clave sin saber de qué tipo es.
export const MEDALLAS = { ...MEDALLAS_AUTOMATICAS, ...MEDALLAS_ESPECIALES };

export function esMedallaEspecial(clave) {
  return Object.prototype.hasOwnProperty.call(MEDALLAS_ESPECIALES, clave);
}

const MINIMO_PROYECTOS = 5;
const MINIMO_FACETAS = 3;

/**
 * @param proyectos los que devuelve el perfil: { id, titulo, papel, lider }
 * @param otorgadas filas de medallas_otorgadas de esa persona
 */
export function medallasDe(proyectos = [], otorgadas = []) {
  const ganadas = [];

  if (proyectos.length > 0) {
    ganadas.push({ clave: 'proyecto', ...MEDALLAS_AUTOMATICAS.proyecto });
  }

  // "Grandes aportes" por cantidad o por variedad: quien ha hecho electrónica,
  // control y documentación ha aportado tanto como quien firma cinco veces lo
  // mismo, y premiar solo el número empujaría a firmarlo todo.
  const facetas = new Set(
    proyectos.map((p) => (p.papel || '').trim().toLowerCase()).filter(Boolean)
  );
  if (proyectos.length >= MINIMO_PROYECTOS || facetas.size >= MINIMO_FACETAS) {
    ganadas.push({ clave: 'aportes', ...MEDALLAS_AUTOMATICAS.aportes });
  }

  if (proyectos.some((p) => p.lider)) {
    ganadas.push({ clave: 'lider', ...MEDALLAS_AUTOMATICAS.lider });
  }

  for (const o of otorgadas) {
    const base = MEDALLAS_ESPECIALES[o.clave];
    if (!base) continue;   // una medalla retirada del catálogo no se inventa
    ganadas.push({
      clave: o.clave,
      ...base,
      // Quién y cuándo van a la vista: es lo que sostiene una medalla que no
      // se puede comprobar en los datos.
      motivo: o.motivo || '',
      otorgada_por: o.otorgada_por,
      fecha: o.fecha,
    });
  }

  return ganadas;
}
