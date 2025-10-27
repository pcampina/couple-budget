# Stage 1: Build the application
FROM node:lts-bookworm-slim AS builder
WORKDIR /app

# 1. Install ALL dependencies (including dev)
COPY package*.json ./
RUN npm ci

# 2. Copy source code and build the app
COPY . .
RUN npm run build:api

# 3. Prune dev dependencies for a clean production node_modules
RUN npm prune --omit=dev

# Stage 2: Production environment
FROM node:lts-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# Copy production-only node_modules and built API from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/dist-api ./dist-api

# Copy knex config and migrations for running migrations
COPY api/knexfile.cjs ./
COPY api/migrations ./migrations

# Expose the port the app runs on
EXPOSE 3333

# Start the application
CMD ["sh", "-c", "node ./node_modules/knex/bin/cli.js --knexfile knexfile.cjs migrate:latest && node dist-api/server.js"]
