# Stage 1: Build the application
FROM node:lts-bookworm-slim AS builder

WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package*.json ./
COPY api/tsconfig.json api/
COPY tsconfig.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy the rest of the source files
COPY . .

# Build the API
RUN npm run build:api


# Stage 2: Production environment
FROM node:lts-bookworm-slim

WORKDIR /app

# Copy built application from the builder stage
COPY --from=builder /app/dist-api .
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD [ "node", "server.js" ]
