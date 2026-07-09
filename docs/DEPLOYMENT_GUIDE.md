# RouteX Production Deployment Guide

This guide details the step-by-step instructions for deploying RouteX in a production cloud environment.

---

## 📋 Prerequisites
- **Docker & Docker Compose** (version 20+ / 2.20+)
- **Kubernetes CLI** (`kubectl`) & `helm`
- **AWS CLI** configured with administrator credentials (if deploying to EKS)
- **Node.js 20+** (for local verification)

---

## 📦 Local Production Verification

To test the entire RouteX stack (Backend, Frontend, Postgres, Redis, Nginx) locally under production configurations:

1. Copy and configure the environment variables:
   ```bash
   cp routex-backend/.env.example routex-backend/.env
   # Edit routex-backend/.env with your production credentials
   ```

2. Build and start the services using the production compose file:
   ```bash
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

3. Nginx will spin up on port `80`. Access:
   - Web Frontend: `http://localhost`
   - APIs: `http://localhost/api`
   - Swagger Documentation: `http://localhost/docs`
   - Socket.IO Path: `http://localhost/socket.io`

---

## 🚀 Kubernetes EKS Deployment

1. Navigate to the Kubernetes manifests directory:
   ```bash
   cd k8s
   ```

2. Apply the configuration maps and secrets:
   ```bash
   kubectl apply -f configmap.yaml
   kubectl apply -f secrets.yaml
   ```

3. Deploy the databases (PostgreSQL StatefulSet and Redis Deployment):
   ```bash
   kubectl apply -f postgres-statefulset.yaml
   kubectl apply -f redis-deployment.yaml
   ```

4. Verify database pods are healthy and running:
   ```bash
   kubectl get pods -n routex -w
   ```

5. Deploy the application services (Backend and Frontend Deployments):
   ```bash
   kubectl apply -f backend-deployment.yaml
   kubectl apply -f frontend-deployment.yaml
   kubectl apply -f services.yaml
   ```

6. Enable network isolation and auto-scaling rules:
   ```bash
   kubectl apply -f network-policy.yaml
   kubectl apply -f hpa.yaml
   ```

7. Deploy the Ingress resource:
   ```bash
   kubectl apply -f ingress.yaml
   ```

---

## 📈 Monitoring & Logging
- **Structured Logs**: Production logs are outputted as JSON to stdout (visible via `kubectl logs`) and written to local log files under `routex-backend/logs/combined.log` and `error.log`.
- **Sentry Alerts**: Backend exceptions are automatically sent to Sentry. Frontend crashes are monitored under Next.js boundary hooks. Check your Sentry Dashboard for real-time telemetry.
