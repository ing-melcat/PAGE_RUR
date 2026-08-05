#!/bin/bash
# Crea un rol Postgres de mínimo privilegio por microservicio: cada uno solo
# puede leer/escribir la(s) tabla(s) que le corresponden. Un bug o RCE en
# svc-robots (el servicio más expuesto: LiveKit, CrowdSec) no puede leer ni
# tocar la tabla de usuarios, por ejemplo.
#
# Las contraseñas llegan por variables de entorno del contenedor `db`
# (definidas en docker-compose.yml a partir de .env) — nunca hardcodeadas.
set -euo pipefail

: "${IDENTITY_DB_PASSWORD:?IDENTITY_DB_PASSWORD no definida}"
: "${CONTENT_DB_PASSWORD:?CONTENT_DB_PASSWORD no definida}"
: "${ROBOTS_DB_PASSWORD:?ROBOTS_DB_PASSWORD no definida}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE ROLE svc_identity_role LOGIN PASSWORD '${IDENTITY_DB_PASSWORD}';
    CREATE ROLE svc_content_role LOGIN PASSWORD '${CONTENT_DB_PASSWORD}';
    CREATE ROLE svc_robots_role LOGIN PASSWORD '${ROBOTS_DB_PASSWORD}';

    GRANT USAGE ON SCHEMA public TO svc_identity_role, svc_content_role, svc_robots_role;

    GRANT SELECT, INSERT, UPDATE, DELETE ON users TO svc_identity_role;
    GRANT USAGE, SELECT ON SEQUENCE users_id_seq TO svc_identity_role;

    GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO svc_content_role;

    GRANT SELECT, INSERT, UPDATE, DELETE ON robots TO svc_robots_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON logs TO svc_robots_role;
    GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO svc_robots_role;

    -- logs es una tabla de auditoría cruzada: identity también escribe ahí
    -- (login exitoso/fallido, alta/baja de usuarios), pero solo puede
    -- insertar -- la lectura de GET /api/logs vive en svc-robots, junto con
    -- el resto del panel de administración.
    GRANT INSERT ON logs TO svc_identity_role;
    GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO svc_identity_role;
EOSQL
