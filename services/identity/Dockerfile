# Build context = raíz del repo (necesita ver services/shared además de
# services/identity). En docker-compose: build.context: . / dockerfile:
# services/identity/Dockerfile
#
# node_modules se instala en /app (ancestro común de services/identity y
# services/shared) para que la resolución de módulos ESM de Node encuentre
# los paquetes también al importar desde ../shared/*.js.
FROM node:20-alpine
WORKDIR /app

COPY services/identity/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY services/shared ./services/shared
COPY services/identity ./services/identity

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/hello || exit 1

USER node

CMD ["node", "services/identity/server.js"]
