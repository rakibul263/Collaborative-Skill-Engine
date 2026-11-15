# ==============================================================================
# Stage 1: Build the production React SPA
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time configuration (read by Vite at compile time)
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./

# Reproducible install straight from the lockfile
RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ==============================================================================
# Stage 2: Ultra-minimal Nginx Alpine-Slim runtime
# Serves the compiled bundle with gzip and client-side routing fallback
# ==============================================================================
FROM nginx:alpine-slim AS runner

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
