# RouteX Docker Configurations & Development Guide

This guide details the Docker setup, local environment run scripts, and multi-stage optimization details for RouteX.

---

## 🏗️ Docker Configurations

We maintain separate configurations for local development and production runs:

| File | Context | Stage / Command | Purpose |
|------|---------|-----------------|---------|
| `routex-backend/Dockerfile` | Production Backend | 3-stage / Alpine | Minimizes size, sets non-root user, implements health check. |
| `routex-backend/Dockerfile.dev` | Development Backend | Single-stage / Alpine | Maps source code volumes, supports NestJS hot reload. |
| `routex-web/Dockerfile` | Production Frontend | 3-stage / standalone | Next.js standalone server optimized for EKS. Size: ~120MB. |
| `routex-web/Dockerfile.dev` | Development Frontend | Single-stage / Alpine | Maps source code volumes, supports Next.js fast refresh. |

---

## 🏃 Running Services Locally

### 1. Local Development Stack
Spin up the development services (attaches Postgres and Redis to local source folders with hot reloading):
```bash
docker-compose up --build
```

### 2. Local Production Sandbox
Build and spin up the optimized production images locally behind Nginx reverse proxy:
```bash
docker-compose -f docker-compose.prod.yml up --build
```

---

## 🐳 Docker Multi-stage Optimization Details
1. **Alpine Base Images**: Utilizing `node:20-alpine` decreases the image footprint and removes unnecessary shell utilities (e.g. compilers) to reduce vulnerabilities.
2. **Next.js Standalone**: Configuring `output: 'standalone'` in Next.js config ensures that only files required for production execution are copied. `node_modules` is not shipped in the final layer.
3. **Database Migration Script**: In the production backend container, `docker-entrypoint.sh` executes `npx prisma migrate deploy` on container startup before booting the server. This prevents application services from connecting to out-of-date database schemas.
