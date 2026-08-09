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
      // Sin esto el default es esperar indefinidamente por un cliente libre:
      // si el pool de 10 se agota (una query lenta reteniendo conexiones),
      // las siguientes peticiones se quedaban colgadas en vez de fallar
      // rápido con un error explícito.
      connectionTimeoutMillis: 5_000,
    });
  }
  return pool;
}
