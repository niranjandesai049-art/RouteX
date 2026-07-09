# RouteX Enterprise Production Readiness Checklist

Before taking RouteX live for commercial freight bookings, verify that all checklist items are ticked off.

---

## 1. Secrets & Credentials Isolation
- [ ] Rotate all development credentials exposed in source control:
  - [ ] Rotate PostgreSQL database passwords.
  - [ ] Generate a new cryptographically secure 512-bit `JWT_SECRET`.
  - [ ] Generate new Groq API keys.
- [ ] Add production secrets directly inside **AWS Secrets Manager** (EKS) or **Kubernetes Secrets** (standard deploy). Do not put credentials in git.
- [ ] Ensure `.env` is listed in all `.gitignore` files to prevent credentials exposure.

---

## 2. API & Frontend Configuration
- [ ] Whitelist production client URLs in backend `CORS_ALLOWED_ORIGINS` environment variable.
- [ ] Set `NEXT_PUBLIC_API_URL` to point to the production Load Balancer address during the frontend Docker build.
- [ ] Verify Nginx routes match all api paths (`/auth`, `/bookings`, `/users`, etc.) and web paths correctly.

---

## 3. Observability & Logging
- [ ] Set `SENTRY_DSN` in both backend and frontend environment configurations.
- [ ] Verify Winston JSON logs are writing correctly to `routex-backend/logs/combined.log` and `error.log`.
- [ ] Configure log shipping agent (AWS CloudWatch agent or FluentBit) to forward files to external monitoring pools.

---

## 4. Scalability & High Availability
- [ ] Verify RDS Postgres instance is deployed in Multi-AZ mode.
- [ ] Verify ElastiCache Redis replication is active.
- [ ] Deploy at least 2 replicas of both backend and frontend pods to support zero-downtime rolling deployments in EKS.
- [ ] Ensure Horizontal Pod Autoscalers (HPA) are configured and enabled.
