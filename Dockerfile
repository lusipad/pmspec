# Stage 1: Build CLI and shared types
FROM node:20-alpine AS cli-builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source and build CLI
COPY src/ src/
COPY tsconfig.json ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/web/backend

# Copy package files
COPY web/backend/package*.json ./
RUN npm ci

# Copy source and build
COPY web/backend/src/ src/
COPY web/backend/tsconfig.json ./
RUN npm run build

# Stage 3: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web/frontend

# Copy package files
COPY web/frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY web/frontend/ ./
RUN npm run build

# Stage 4: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies for CLI
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy CLI build
COPY --from=cli-builder /app/dist/ dist/

# Copy backend
WORKDIR /app/web/backend
COPY web/backend/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/web/backend/dist/ dist/

# Copy frontend static files
COPY --from=frontend-builder /app/web/frontend/dist/ /app/web/frontend/dist/

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup -g 1001 -S pmspec && \
    adduser -S pmspec -u 1001 -G pmspec

# Create directories for data and logs
RUN mkdir -p /data /logs && \
    chown -R pmspec:pmspec /app /data /logs

USER pmspec

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start server
WORKDIR /app/web/backend
CMD ["node", "dist/server.js"]
