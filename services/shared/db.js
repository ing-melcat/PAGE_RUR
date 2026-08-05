// Pool de Postgres compartido. Usa las variables de entorno estándar de
// libpq (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) que node-postgres
// lee automáticamente — cada servicio las trae con su propio rol de mínimo
// privilegio (ver db/init/02-roles.sh), nunca con el superusuario.
import pg from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}
