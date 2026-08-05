# Despliegue a producción — guía paso a paso

Este documento es el runbook para pasar del monolito actual (`rur-web` +
archivos JSON) a la arquitectura de 3 servicios + Postgres descrita en
`docker-compose.yml`. Sigue las fases en orden; cada una es reversible sin
tumbar el sitio completo. **Nada de esto se ejecuta solo — cada fase se
aplica a mano, revisando el resultado antes de pasar a la siguiente.**

## 0. Generar secretos reales

Copiar `.env.example` a `.env` y llenar cada valor con:

```bash
openssl rand -base64 32
```

No reutilizar el `JWT_SECRET` actual solo si quieres invalidar sesiones
existentes; si lo dejas igual, las sesiones activas del sistema viejo
siguen siendo válidas contra el nuevo `svc-identity` (mismo algoritmo/HS256).

`CROWDSEC_BOUNCER_API_KEY` **no se genera con openssl** — es una clave que
CrowdSec emite. En el host, con el contenedor `crowdsec` ya corriendo:

```bash
docker exec crowdsec cscli bouncers add caddy-bouncer
```

Copiar la clave que imprime a `CROWDSEC_BOUNCER_API_KEY` en `.env`.

`CROWDSEC_API_KEY` (la que usa `svc-robots` para leer métricas) se genera
igual pero como *machine* / API client, no como bouncer:

```bash
docker exec crowdsec cscli bouncers add rur-metrics-reader
```

## 1. Frontend estático (bajo riesgo)

```bash
./scripts/deploy-frontend.sh
docker compose up -d caddy
```

Esto reconstruye Caddy con el bouncer de CrowdSec y empieza a servir
`dist-releases/current` directo. `/api/*` sigue yendo al monolito
(`rur-web`) sin cambios todavía porque el Caddyfile ya apunta a los 3
servicios nuevos — **por eso el paso 2 debe ir justo después**, no se puede
dejar el sitio a medias con el Caddyfile nuevo pero sin los servicios
backend arriba.

## 2. Postgres + migración (sin cortar tráfico aún)

```bash
docker compose up -d db
docker compose run --rm \
  -e ROBOTS_SECRET_KEY="$ROBOTS_SECRET_KEY" \
  --entrypoint node svc-robots ../../scripts/migrate-json-to-pg.mjs
```

(O ejecutar `scripts/migrate-json-to-pg.mjs` desde cualquier contenedor
conectado a `rur_db_net` con las variables `PG*` apuntando a `db`.)

Verificar conteos de filas contra los JSON antes de continuar (el script ya
imprime ambos).

## 3. Levantar los 3 servicios y cortar tráfico

```bash
docker compose up -d svc-identity svc-content svc-robots
```

En este punto Caddy (ya reconstruido en el paso 1) empieza a enrutar
`/api/*` a los 3 servicios nuevos en vez del monolito. Probar de inmediato:

```bash
curl -s https://rur.unipolidgo.edu.mx/api/posts | head -c 200
```

Si algo falla: revertir el `Caddyfile` a `reverse_proxy rur-web:80` para
todo `/api/*` y `docker compose up -d caddy` — el monolito sigue corriendo
y con sus JSON intactos, no se tocaron.

## 4. Confirmar estabilidad (varios días)

Login real, panel de administración, CRUD de posts/usuarios/robots, y el
flujo de LiveKit (operador y espectador público) probados por un usuario
real. Revisar `docker compose logs` de los 3 servicios.

## 5. Decomisionar el monolito

```bash
docker compose stop rur-web
docker compose rm rur-web
```

Quitar el servicio `rur-web` de `docker-compose.yml` y el bloque
`# ETAPA 2` del `Dockerfile` raíz si ya no se usa para nada más.

## 6. Réplicas + failover (opcional, aditivo)

Ver `docker-compose.replicas.example.yml`. Solo después de que el paso 4
lleve varios días estable.

## 7. Backups

```bash
docker compose up -d db-backup
```

Confirmar que aparecen archivos en `/home/rur/backups/pg/` al día
siguiente. Restaurar un dump:

```bash
docker exec -i page_rur_db pg_restore -U postgres -d rur --clean --if-exists < backup.dump
```

## Rollback de emergencia (en cualquier punto tras el paso 1)

```bash
git checkout HEAD~N -- Caddyfile   # o restaurar el Caddyfile anterior a mano
docker compose up -d caddy
```

Mientras `rur-web` no se haya decomisionado (paso 5), esto regresa el sitio
al estado monolítico anterior en el tiempo que tarda Caddy en reiniciar.
