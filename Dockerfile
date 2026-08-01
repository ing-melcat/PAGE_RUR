# ============================================
# Dockerfile - RUR Panel de Control
# Build multi-stage: Vite (build) + Node (serve)
# ============================================

# ETAPA 1: Build del frontend con Vite
FROM node:20-alpine AS build-stage
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ETAPA 2: Servidor de producción (Node.js)
FROM node:20-alpine AS production-stage
WORKDIR /app

# Solo copiar lo necesario para producción
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/api ./api
COPY --from=build-stage /app/uploads ./uploads

# Instalar dependencias del backend
WORKDIR /app/api
COPY api/package*.json ./
RUN npm ci --omit=dev

WORKDIR /app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001
ENV JWT_SECRET=cambiar_en_produccion

EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/robots || exit 1

CMD ["node", "api/server.js"]
