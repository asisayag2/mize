# Build stage
FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Copy Prisma schema (needed for postinstall)
COPY server/prisma ./server/prisma

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build client and server
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Copy Prisma schema (needed for postinstall and migrations)
COPY server/prisma ./server/prisma

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built client
COPY --from=builder /app/client/dist ./client/dist

# Copy built server
COPY --from=builder /app/server/dist ./server/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run migration and start server
CMD cd /app/server && npx prisma db push --skip-generate && cd /app && npm run start
