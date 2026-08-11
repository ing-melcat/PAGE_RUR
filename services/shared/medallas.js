/**
 * Las medallas de una persona.
 *
 * Cuatro, y ninguna más. El riesgo de un sistema así no es que falten medallas
 * — es la inflación: si todo el mundo tiene cuatro, dejan de significar algo y
 * pasan a estorbar en cada tarjeta. Por eso los umbrales son altos y la lista
 * es corta.
 *
 * Se separan por naturaleza, que es lo que decide si se calculan o se otorgan:
 *
 *   - Un HECHO se calcula. Está en los datos, no hay que mantenerlo, no se
 *     puede regalar y no se olvida de dárselo a nadie.
 *   - Un JUICIO se otorga. No hay número que represente "excelencia", y
 *     fabricar uno la volvería mentira.
 *
 * Las calculadas no se guardan en ninguna parte: se deducen cada vez que se
 * pide el perfil. Aparecen solas cuando se cumplen y desaparecen si el
 * proyecto que las sostenía deja de estar publicado, que es lo correcto — una
 * medalla por algo que ya no existe es una medalla falsa.
 */

export const MEDALLAS = {
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
  excelencia: {
    nombre: 'Excelencia',
    descripcion: 'Reconocimiento otorgado por la coordinación.',
  },
};

const MINIMO_PROYECTOS = 5;
const MINIMO_FACETAS = 3;

/**
 * @param proyectos los que devuelve el perfil: { id, titulo, papel, lider }
 * @param otorgadas filas de medallas_otorgadas de esa persona
 */
export function medallasDe(proyectos = [], otorgadas = []) {
  const ganadas = [];

  if (proyectos.length > 0) {
    ganadas.push({ clave: 'proyecto', ...MEDALLAS.proyecto });
  }

  // "Grandes aportes" por cantidad o por variedad: quien ha hecho electrónica,
  // control y documentación ha aportado tanto como quien firma cinco veces lo
  // mismo, y premiar solo el número empujaría a firmarlo todo.
  const facetas = new Set(
    proyectos.map((p) => (p.papel || '').trim().toLowerCase()).filter(Boolean)
  );
  if (proyectos.length >= MINIMO_PROYECTOS || facetas.size >= MINIMO_FACETAS) {
    ganadas.push({ clave: 'aportes', ...MEDALLAS.aportes });
  }

  if (proyectos.some((p) => p.lider)) {
    ganadas.push({ clave: 'lider', ...MEDALLAS.lider });
  }

  for (const o of otorgadas) {
    const base = MEDALLAS[o.clave];
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
