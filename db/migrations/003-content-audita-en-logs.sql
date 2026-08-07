-- 003 — svc-content pasa a escribir en la tabla de auditoría.
--
-- Crear, editar y eliminar publicaciones no dejaba ningún rastro: a
-- diferencia de svc-identity (login, altas/bajas de usuarios) y svc-robots
-- (CRUD de robots, tokens), svc-content nunca escribía en `logs`, y ni
-- siquiera tenía el permiso a nivel de base de datos para hacerlo. Se cierra
-- esa asimetría entre los tres microservicios.
--
-- Mismo criterio que ya usa svc_identity_role: solo INSERT, nunca SELECT — la
-- lectura de GET /api/logs sigue viviendo exclusivamente en svc-robots.
--
-- Idempotente: GRANT se puede repetir sin efecto si ya estaba concedido.

GRANT INSERT ON logs TO svc_content_role;
GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO svc_content_role;
