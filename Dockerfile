# Multi-stage build for API (TypeScript -> JS)
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy API sources and build
COPY api ./api
RUN npx tsc -p api/tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node_modules (includes dev deps to run knex CLI) and built API
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist-api ./dist-api

# Copy TypeScript files for ts-node
COPY api ./api

EXPOSE 3333

# Run migrations (TypeScript via ts-node) then start API
CMD ["sh", "-c", "node -r ts-node/register ./node_modules/knex/bin/cli.js --knexfile api/knexfile.ts migrate:latest && node dist-api/server.js"]
