# syntax=docker/dockerfile:1
# Full-stack combined container: nginx (SPA) + Express backend via supervisord.
# HAS_BACKEND=true (colossus.yaml has backend: key). Frontend served at /,
# /api/ proxied to backend on 127.0.0.1:3000.

# ---- frontend build ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel=error
COPY web/ ./
RUN npx vite build

# ---- backend build ----
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --loglevel=error
COPY backend/ ./
RUN npx prisma generate
RUN npm run build \
 && test -n "$(find /app/backend/dist -name server.js | head -1)" \
    || (echo 'ERROR: no server.js in dist — check tsconfig rootDir' && exit 1)

# ---- runtime ----
FROM node:20-alpine AS runtime
RUN apk add --no-cache nginx supervisor
WORKDIR /app

# Backend runtime: install prod deps + copy compiled dist + prisma
COPY backend/package*.json /app/backend/
WORKDIR /app/backend
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund --loglevel=error
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma

# Frontend static files
COPY --from=frontend-builder /app/web/dist /usr/share/nginx/html

# nginx + supervisord configs
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# Ensure required directories
RUN mkdir -p /run/nginx /var/log/nginx

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
