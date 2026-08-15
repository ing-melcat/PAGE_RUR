export function getRoles(user: any): string[] {
  if (Array.isArray(user?.roles)) return user.roles;
  return user?.rol ? [user.rol] : [];
}

export const AREAS = ['Hardware', 'Software', 'Control', 'Mecánica', 'Diseño', 'Difusión'];

export function hasRole(user: any, ...roles: string[]): boolean {
  const owned = getRoles(user);
  return roles.some((role) => owned.includes(role));
}

export function puede(user: any, ...permisos: string[]): boolean {
  const suyos: string[] = Array.isArray(user?.permisos) ? user.permisos : [];
  if (suyos.length === 0 && hasRole(user, 'admin')) return true;
  return permisos.some((p) => suyos.includes(p));
}
