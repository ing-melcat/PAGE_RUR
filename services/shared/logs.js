// Registro compartido a la tabla `logs`. Estaba copiado literal (mismo
// cuerpo) en services/identity/server.js y services/robots/server.js.
import { getPool } from './db.js';

export async function saveLog(type, message) {
  await getPool().query('INSERT INTO logs (type, message) VALUES ($1, $2)', [type, message]);
}
