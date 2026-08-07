# RUR — Research Unit of Robotics

Sitio público + panel de control de robots de **Research Unit of Robotics**,
publicado en `rur.unipolidgo.edu.mx`. SPA de React/TypeScript sobre un
conjunto de microservicios en Node/Express con Postgres, servido por Caddy.

Repositorio privado. Consulta [`LICENSE`](./LICENSE) antes de reutilizar
cualquier parte del código.

## Qué hace

- **Sitio público / CMS**: publicaciones, archivo, páginas informativas del
  laboratorio.
- **Panel de administración**: gestión de usuarios, publicaciones y unidades
  robóticas, con roles (`admin`, `operador`, `redactor`).
- **Consola del operador**: teleoperación de los robots vía WebRTC (LiveKit) —
  joystick, mando o teclado, video en vivo, telemetría.
- **Modo espectador**: `/espectador/:robotId`, transmisión pública de solo
  lectura para robots marcados como evento público, sin necesidad de cuenta.

## Arquitectura

El backend está migrando de un monolito (`api/server.js`, aún presente solo
como red de seguridad para rollback, sin tráfico real) a tres microservicios
independientes, cada uno con su propio rol de base de datos de mínimo
privilegio:

| Servicio | Responsabilidad |
|---|---|
| `services/identity/` | Login, sesión, CSRF, usuarios, perfil |
| `services/content/` | CMS público: publicaciones y subida de archivos |
| `services/robots/` | CRUD de robots, tokens de LiveKit, logs, métricas |
| `services/shared/` | Código compartido: auth, CSRF, pool de Postgres, cifrado |

Postgres guarda el estado; Caddy enruta `/api/*` a los tres servicios y sirve
el resto como SPA estática. El detalle completo de la migración y el orden de
despliegue está en [`DEPLOY.md`](./DEPLOY.md); el esquema y las migraciones de
base de datos, en [`db/README.md`](./db/README.md).

## Desarrollo local

```bash
npm install
npm run dev        # servidor de Vite (solo frontend)
```

Para correr el backend real (los 3 servicios + Postgres), no el monolito
legado:

```bash
docker compose up -d db svc-identity svc-content svc-robots
```

`npm start` levanta únicamente el monolito legado (`api/server.js`) — no es
el camino recomendado, ver [`DEPLOY.md`](./DEPLOY.md).

Cada servicio bajo `services/*/` tiene su propio `package.json`; instala
dependencias dentro de cada carpeta, no en la raíz.

## Otros comandos

```bash
npm run build     # build de producción -> dist/
npm run lint      # oxlint
npm run preview   # previsualizar un build de producción
```

No hay test runner configurado todavía.
