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
# and create mount directory for persistent FAISS index storage
RUN rm -rf /opt/yarn* /usr/local/lib/node_modules/corepack /usr/share/doc/* /usr/share/man/* && \
    mkdir -p /app/storage

# Copy production node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy only required production server application files & directories
COPY package.json index.js firebase-service-account.json ./
COPY config ./config
COPY controllers ./controllers
COPY data ./data
COPY middleware ./middleware
COPY routes ./routes
COPY services ./services
COPY utils ./utils

EXPOSE 3000

CMD ["node", "index.js"]
