## Qué cambia y por qué

<!-- Una o dos frases: el problema o la necesidad, no solo la lista de archivos. -->

## Cómo se probó

<!-- Comandos corridos, pantallas verificadas manualmente, capturas si aplica. -->

## Riesgo del despliegue

- [ ] Solo frontend (`./scripts/deploy-frontend.sh`)
- [ ] Toca un microservicio (¿cuál? — requiere `docker compose up -d --build svc-X`)
- [ ] Incluye migración de base de datos (¿cuál archivo en `db/migrations/`? ¿se aplicó a mano antes de reiniciar el servicio?)
- [ ] Toca `Caddyfile` (requiere `docker compose up -d --build caddy`)

## Checklist

- [ ] `npx tsc --noEmit -p tsconfig.app.json` no agrega errores nuevos
- [ ] Probado en pantalla, no solo compilado
- [ ] Si toca el espectador público (`SpectatorApp`/`BarraTelemetria`), se confirmó que el protocolo de control interno no viaja en su bundle
