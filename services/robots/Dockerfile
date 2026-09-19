# Build context = raíz del repo. Ver services/identity/Dockerfile para el
# porqué de instalar node_modules en /app (ancestro común con services/shared).
FROM node:20-alpine
WORKDIR /app

COPY services/robots/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY services/shared ./services/shared
COPY services/robots ./services/robots

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/api/hello || exit 1

USER node

CMD ["node", "services/robots/server.js"]
