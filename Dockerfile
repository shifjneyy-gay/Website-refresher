# Production multi-stage Docker build optimized for Railway, Cloud Run, and Docker
FROM node:22-alpine AS builder
WORKDIR /app

# Cache package manifests
COPY package*.json ./
RUN npm install --prefer-offline --no-audit --no-fund

# Copy source and build client + minified server
COPY . .
RUN npm run build

# Ultra-lightweight production runtime container (~80MB total)
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Limit Node memory ceiling for Railway's lightweight containers
ENV NODE_OPTIONS="--max-old-space-size=256"

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --prefer-offline --no-audit --no-fund --ignore-scripts && npm cache clean --force

# Copy precompiled client assets and minified server bundle
COPY --from=builder /app/dist ./dist

# Non-root user for security and resource isolation
USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
