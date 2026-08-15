/**
 * Qué se puede hacer en el sistema, y quién.
 *
 * El catálogo vive en código y no en la base a propósito: cada permiso
 * corresponde a una comprobación real en alguna ruta. Uno inventado desde el
 * panel no daría acceso a nada, porque no habría nadie mirándolo — sería un
 * botón que promete algo que no ocurre.
 *
 * Lo que sí es editable desde el panel es qué permisos tiene cada rol, y qué
 * permisos sueltos tiene una persona además de los de sus roles.
 */

export const PERMISOS = {
  'usuarios.gestionar': 'Crear, editar y borrar cuentas',
  'roles.gestionar': 'Crear roles y decidir qué puede cada uno',
  'medallas.gestionar': 'Crear medallas y decidir qué reconocen',
  'publicaciones.editar': 'Crear y editar publicaciones',
  'publicaciones.borrar': 'Borrar publicaciones',
  'publicaciones.firmar': 'Decidir quién desarrolló cada proyecto',
  'robots.operar': 'Conducir el robot desde la consola',
  'robots.gestionar': 'Dar de alta unidades y cambiar su configuración',
  'transmision.gestionar': 'Poner unidades en directo y generar overlays',
  'logs.ver': 'Consultar el registro de actividad',
};

export const ES_PERMISO = (p) => Object.hasOwn(PERMISOS, p);

/**
 * El rol `admin` lo puede todo, siempre.
 *
 * Va en código y no en su fila de la base porque es la red de seguridad: si
 * alguien le quita permisos a `admin` desde el panel —por error o por probar—
 * nadie podría volver a entrar a arreglarlo. Con esto, el sistema no puede
 * quedarse sin administradores.
 */
export const ROL_TOTAL = 'admin';

/**
 * Los permisos efectivos de alguien: los de todos sus roles, más los suyos
 * propios. No hay denegaciones — un modelo de "permitir + denegar" obliga a
 * explicar por qué alguien no puede hacer algo que su rol dice que sí, y esa
 * conversación no la gana nadie.
 */
export function permisosEfectivos(rolesDelUsuario, filasDeRoles, permisosExtra = []) {
  if (rolesDelUsuario?.includes(ROL_TOTAL)) return new Set(Object.keys(PERMISOS));

  const efectivos = new Set();
  for (const fila of filasDeRoles ?? []) {
    if (!rolesDelUsuario?.includes(fila.nombre)) continue;
    for (const p of fila.permisos ?? []) if (ES_PERMISO(p)) efectivos.add(p);
  }
  for (const p of permisosExtra ?? []) if (ES_PERMISO(p)) efectivos.add(p);
  return efectivos;
}
