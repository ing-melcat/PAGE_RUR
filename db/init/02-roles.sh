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
    GRANT SELECT, INSERT, UPDATE, DELETE ON post_translations TO svc_content_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON post_miembros TO svc_content_role;
    -- svc-content necesita leer users para resolver los nombres de quienes
    -- firman una publicación. Solo lectura: ningún permiso sobre cuentas.
    GRANT SELECT ON users TO svc_content_role;
    -- svc-identity sirve la lista de miembros con sus proyectos; escribir
    -- quién firma qué es cosa del panel de publicaciones, o sea de content.
    GRANT SELECT ON post_miembros TO svc_identity_role;
    GRANT SELECT ON posts TO svc_identity_role;

    GRANT SELECT, INSERT, UPDATE, DELETE ON robots TO svc_robots_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON logs TO svc_robots_role;
    GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO svc_robots_role;

    -- logs es una tabla de auditoría cruzada: identity y content también
    -- escriben ahí (login exitoso/fallido, alta/baja de usuarios, alta/edición/
    -- baja de publicaciones), pero solo pueden insertar -- la lectura de
    -- GET /api/logs vive en svc-robots, junto con el resto del panel de
    -- administración.
    GRANT INSERT ON logs TO svc_identity_role;
    GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO svc_identity_role;
    GRANT INSERT ON logs TO svc_content_role;
    GRANT USAGE, SELECT ON SEQUENCE logs_id_seq TO svc_content_role;

    -- Los tres servicios resuelven permisos en cada petición, así que los tres
    -- necesitan leer los roles. Escribirlos es cosa de identity, que es quien
    -- administra personal.
    GRANT SELECT ON roles TO svc_identity_role, svc_content_role, svc_robots_role;
    GRANT INSERT, UPDATE, DELETE ON roles TO svc_identity_role;

    -- Resolver permisos mira también los sueltos de la persona, que viven en
    -- users. svc-content ya lee esa tabla entera; a svc-robots se le conceden
    -- las dos columnas que necesita y ninguna más.
    GRANT SELECT (matricula, permisos_extra) ON users TO svc_robots_role;

    -- identity sirve los perfiles con sus medallas y es quien las otorga desde
    -- el panel de personal.
    GRANT SELECT, INSERT, UPDATE, DELETE ON medallas_otorgadas TO svc_identity_role;
    GRANT USAGE, SELECT ON SEQUENCE medallas_otorgadas_id_seq TO svc_identity_role;
EOSQL
