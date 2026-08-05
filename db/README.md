# db/

Schema y bootstrap de Postgres para PAGE_RUR. Reemplaza el almacenamiento en
`api/data/*.json` (ver `scripts/migrate-json-to-pg.mjs` para la migración de
los datos existentes).

- `init/01-schema.sql` — tablas (`users`, `posts`, `robots`, `logs`).
- `init/02-roles.sh` — crea un rol Postgres por microservicio con acceso solo
  a su(s) tabla(s) (mínimo privilegio). Requiere `IDENTITY_DB_PASSWORD`,
  `CONTENT_DB_PASSWORD`, `ROBOTS_DB_PASSWORD` en el entorno del contenedor.

Docker ejecuta todo lo que hay en `docker-entrypoint-initdb.d/` en orden
alfabético **solo la primera vez** que el volumen de datos está vacío. Si
cambias estos archivos después del primer arranque, no se vuelven a aplicar
solos — hay que correrlos a mano o recrear el volumen.

El servicio `db` en `docker-compose.yml` nunca debe publicar el puerto 5432
al host (`expose`, no `ports`) — la base de datos solo debe ser alcanzable
desde los servicios backend en la red interna de Docker.
