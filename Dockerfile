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

