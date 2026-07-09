# RouteX CI/CD Pipeline Guide

This guide details the GitHub Actions CI/CD pipeline, pull request checks, and automatic main branch release packaging.

---

## ⚙️ CI/CD Workflow (`ci-cd.yml`)

The workflow file is located at `.github/workflows/ci-cd.yml` and is split into two validation gates:

### Gate 1: Pull Request Verification (Test & Lint)
- **Triggers**: On pull requests targeting the `main` branch.
- **Workflow Steps**:
  1. Check out code.
  2. Setup Node.js 20 environment with npm dependency caching.
  3. Install dependencies in `routex-backend` and execute `npm run lint`, `npm run build`, and `npm run test` (Jest).
  4. Install dependencies in `routex-web` and execute `npm run lint` and `npm run build`.
- **Result**: PR builds must pass all verification checks before code can be merged into `main`.

### Gate 2: Main Branch Packaging (Build & Push Docker)
- **Triggers**: On pushes or merged pull requests to the `main` branch.
- **Workflow Steps**:
  1. Executes all tests and lints (dependencies must pass).
  2. Sets up Docker Buildx in the runner.
  3. Builds the backend production Docker image using `routex-backend/Dockerfile` and tags it as `routex-backend:latest` and `routex-backend:<git_sha>`.
  4. Builds the frontend production Docker image using `routex-web/Dockerfile` with build argument injection (`NEXT_PUBLIC_API_URL`) and tags it as `routex-frontend:latest` and `routex-frontend:<git_sha>`.
  5. Outputs completion notification status.

---

## 🔐 Production Credentials Integration (EKS Deployments)
For EKS deployment automation, configure the following secrets under GitHub Repository Secrets:
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` – AWS credentials to log in to ECR.
- `AWS_REGION` – Target ECR region.
- `ECR_REGISTRY` – Target AWS container registry URI.
- `KUBECONFIG_DATA` – Base64 encoded kubeconfig file to execute deployment updates via `kubectl set image`.
