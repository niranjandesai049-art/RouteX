# Multi-stage production Dockerfile for RouteX NestJS Backend

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies (openssl is required for Prisma Client)
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

COPY . .

# Generate Prisma Client and build the TypeScript application
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Dependencies
FROM node:20-alpine AS deps

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Runner
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Install runtime dependencies
RUN apk add --no-cache openssl curl

ENV NODE_ENV=production
ENV PORT=3001

# Copy build artifacts and dependencies
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/package.json ./package.json

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Use non-root node user for security hardening
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
