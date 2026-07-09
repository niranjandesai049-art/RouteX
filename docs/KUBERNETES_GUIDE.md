# RouteX Kubernetes Manifests & Orchestration Guide

This guide details the Kubernetes configuration, deployment order, autoscaling thresholds, and pod security network policies for RouteX.

---

## 🗂️ Kubernetes Manifests Layout

The manifests are located under the `k8s/` directory:

| File | Resource Type | Purpose |
|------|---------------|---------|
| `configmap.yaml` | ConfigMap | Contains non-sensitive environment variables (`PORT`, `NODE_ENV`). |
| `secrets.yaml` | Secret | Contains base64-encoded secrets (database credentials, JWT keys). |
| `postgres-statefulset.yaml` | StatefulSet | Deploy Postgres using durable persistent volumes and headless services. |
| `redis-deployment.yaml` | Deployment | Deploy Redis caching instance with liveness/readiness probes. |
| `backend-deployment.yaml` | Deployment | Run the backend services with rolling update configurations. |
| `frontend-deployment.yaml` | Deployment | Run the Next.js standalone UI instances. |
| `services.yaml` | Service | Define ClusterIP services exposing the deployments internally. |
| `ingress.yaml` | Ingress | Nginx Ingress routes targeting APIs/WebSockets and frontend UI. |
| `hpa.yaml` | HorizontalPodAutoscaler | Declare auto-scaling policies based on CPU usage. |
| `network-policy.yaml` | NetworkPolicy | Establish pod-to-pod network security barriers. |

---

## 🚀 Deployment Order
Execute the commands in the following order to resolve dependency constraints:
```bash
# 1. Namespace & Configurations
kubectl create namespace routex
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# 2. Database Stack
kubectl apply -f postgres-statefulset.yaml
kubectl apply -f redis-deployment.yaml

# 3. Application Services
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f services.yaml

# 4. Ingress & Scaling Policies
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
kubectl apply -f network-policy.yaml
```

---

## 🛡️ Pod Isolation & Network Policies
To safeguard the cluster, network policy isolation is enabled:
- **Database Shield**: PostgreSQL (`routex-postgres-policy`) and Redis (`routex-redis-policy`) reject ingress connections from any pod except the `routex-backend` pods.
- **Backend Access**: Backend pods accept connections only from `routex-frontend` pods or external traffic coming through the Ingress controller.
- **Frontend Access**: Frontend pods accept public HTTP connections through the Ingress controller.
