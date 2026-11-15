# ==============================================================================
# Stage 1: Production Dependency Builder
# ==============================================================================
FROM node:20 AS builder

WORKDIR /app

# Copy package manifests & npm configuration first for optimal layer caching
COPY package*.json .npmrc ./

# Install strictly production dependencies
RUN npm install --omit=dev --legacy-peer-deps --no-audit --no-fund && \
    npm cache clean --force

# ==============================================================================
# Stage 2: Minimal Production Runtime (glibc compatible for FAISS & geoip)
# ==============================================================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Remove unnecessary runtime bloat (Yarn, Corepack, system docs/man pages)
# and create the mount point for persistent FAISS index storage
RUN rm -rf /opt/yarn* /usr/local/lib/node_modules/corepack /usr/share/doc/* /usr/share/man/* && \
    mkdir -p /app/storage

# Copy production node_modules from the builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy the application itself. Everything the runtime needs is allow-listed
# via .dockerignore; optional files such as firebase-service-account.json
# are picked up automatically when present in the build context.
COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "index.js"]
