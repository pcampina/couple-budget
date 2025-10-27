# Multi-stage build for API (TypeScript -> JS)
FROM node:20-alpine AS builder
# Update OS packages to get the latest security patches
RUN apk update && apk upgrade --no-cache
WORKDIR /app

# 1. Install ALL dependencies (including dev) and build the app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:api

# 2. Prune dev dependencies for a clean production node_modules
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
# Update OS packages to get the latest security patches
RUN apk update && apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production

# Copy production-only node_modules and built API from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist-api ./dist-api

# Copy knex config and migrations for running migrations
COPY api/knexfile.cjs ./
COPY api/migrations ./migrations

EXPOSE 3333

# Run migrations then start API
CMD ["sh", "-c", "node ./node_modules/knex/bin/cli.js --knexfile knexfile.cjs migrate:latest && node dist-api/server.js"]
