/**
 * Las medallas de una persona.
 *
 * El catálogo —qué medallas existen, cómo se llaman, con qué icono y color—
 * vive en la tabla `medallas` y se edita desde el panel. Aquí no hay ninguna
 * lista: estuvo escrita en este archivo y significaba que inventar una medalla
 * nueva exigía tocar código y desplegar los tres servicios.
 *
 * Lo que sí sigue aquí es lo único que no se puede guardar en una tabla: la
 * REGLA de las automáticas. "Cinco proyectos o trabajo en tres facetas" no es
 * un texto, es una condición que hay que evaluar; escribirla desde un
 * formulario sería inventarse un lenguaje de programación por el camino.
 *
 * De ahí la división:
 *
 *   - AUTOMÁTICA: su regla está abajo, en REGLAS. Se cumple o no se cumple, no
 *     se concede. No se guarda en ninguna parte: se deduce cada vez que se
 *     pide el perfil, así que desaparece sola si el proyecto que la sostenía
 *     deja de estar publicado — que es lo correcto, porque una medalla por
 *     algo que ya no existe es una medalla falsa.
 *   - ESPECIAL: la otorga la coordinación con un motivo escrito, y se guarda
 *     quién la dio. Cualquiera que se cree en el panel es de estas.
 *
 * El riesgo de un sistema así no es que falten medallas: es la inflación. Si
 * todo el mundo las tiene todas, dejan de significar algo y pasan a estorbar
 * en cada tarjeta. Eso ya no lo impone el código — lo impone quien las crea.
 */

const MINIMO_PROYECTOS = 5;
const MINIMO_FACETAS = 3;

/**
 * La condición de cada medalla automática, por su clave.
 *
 * Una clave marcada como automática en la tabla pero sin regla aquí no se
 * concede nunca: es lo que impide que alguien cree desde el panel una medalla
 * "automática" que ningún código sabe calcular y que por tanto no llegaría a
 * aparecerle a nadie sin explicación.
 */
export const REGLAS = {
  proyecto: (proyectos) => proyectos.length > 0,

  // Por cantidad o por variedad: quien ha hecho electrónica, control y
  // documentación ha aportado tanto como quien firma cinco veces lo mismo, y
  // premiar solo el número empujaría a firmarlo todo.
  aportes: (proyectos) => {
    const facetas = new Set(
      proyectos.map((p) => (p.papel || '').trim().toLowerCase()).filter(Boolean)
    );
    return proyectos.length >= MINIMO_PROYECTOS || facetas.size >= MINIMO_FACETAS;
  },

  lider: (proyectos) => proyectos.some((p) => p.lider),
};

export function tieneRegla(clave) {
  return Object.prototype.hasOwnProperty.call(REGLAS, clave);
}

/**
 * @param proyectos  los que devuelve el perfil: { id, titulo, papel, lider }
 * @param otorgadas  filas de medallas_otorgadas de esa persona
 * @param catalogo   filas de la tabla medallas, ya ordenadas
 */
export function medallasDe(proyectos = [], otorgadas = [], catalogo = []) {
  const ganadas = [];
  const concedidas = new Map(otorgadas.map((o) => [o.clave, o]));

  for (const m of catalogo) {
    const base = {
      clave: m.clave,
      nombre: m.nombre,
      descripcion: m.descripcion ?? '',
      icono: m.icono,
      color: m.color,
    };

    if (m.automatica) {
      const regla = REGLAS[m.clave];
      if (regla && regla(proyectos)) ganadas.push(base);
      continue;
    }

    const dada = concedidas.get(m.clave);
    if (!dada) continue;
    ganadas.push({
      ...base,
      // Quién y cuándo van a la vista: es lo que sostiene una medalla que no
      // se puede comprobar en los datos.
      motivo: dada.motivo || '',
      otorgada_por: dada.otorgada_por,
      fecha: dada.fecha,
    });
  }

  return ganadas;
}
