# Legacy PHP / Apache (sin uso)

Archivos movidos aquí el 2026-08-05 porque no se ejecutan en el stack actual:

- El `Dockerfile` solo corre `node api/server.js` (imagen `node:20-alpine`, sin runtime de PHP).
- `Caddyfile` hace `reverse_proxy` directo al contenedor Node; no sirve `.htaccess` (eso es exclusivo de Apache).
- Cada endpoint PHP (`login.php`, `logout.php`, `check_session.php`, `livekit-token.php`, etc.) ya tiene su
  equivalente funcional en `api/server.js` (Express) — de hecho `server.js` responde a `/api/login` **y**
  `/api/login.php` para mantener compatibilidad con clientes viejos.

Se conservan aquí solo como referencia histórica. Si tras confirmar que nada los necesita, se pueden borrar
por completo del repo.
