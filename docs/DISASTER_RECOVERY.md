# RouteX Disaster Recovery & Business Continuity Plan

This plan details the backup schedules, failover procedures, and recovery workflows to guarantee RouteX remains resilient during outages.

---

## ⏱️ Recovery Objectives
- **Recovery Point Objective (RPO)**: Maximum acceptable data loss duration. Target: **5 minutes** (using RDS continuous point-in-time recovery backups).
- **Recovery Time Objective (RTO)**: Maximum acceptable downtime duration. Target: **15 minutes** (automatic multi-AZ failover and standby endpoints).

---

## 1. Database Backups & RDS Point-in-Time Recovery
- **RDS Backups**: Configure automatic daily snapshots with a retention period of 30 days. Enable continuous transaction logging to support point-in-time recovery (PITR) down to the second.
- **Cross-Region Replication**: Enable cross-region snapshot replication (e.g. copying primary RDS snapshots from `us-east-1` to `us-west-2`) to recover during complete AWS regional failures.

---

## 2. Stateless Service Recovery (EKS Pods)
- **Zero-State Containers**: Since backend and frontend containers are stateless, they can be immediately redeployed in any Kubernetes cluster using GitOps (ArgoCD) or by running:
  ```bash
  kubectl apply -f k8s/
  ```
- **Image Registry Backup**: Retain production images in AWS ECR with cross-region replication.

---

## 3. Real-time Gateway State Loss Failover
- **WebSocket Session Re-establishment**: If a backend node crashes, Socket.IO clients automatically disconnect and reconnect. Redis adapter handles routing sync.
- **In-Memory Telemetry Loss**: The latest driver coordinate telemetry is non-critical historical data. During failovers, maps will resume plotting once drivers emit their next periodic update (configured to broadcast every 5 seconds).

---

## 4. Disaster Recovery Scenarios & Playbooks

### Scenario A: Primary Database Failover
- **Detection**: CloudWatch detects RDS instance failure / network disconnect.
- **Action**: RDS automatically promotes the standby replica in AZ2 to primary. EKS connection strings (managed via RDS Proxy) do not change.
- **Recovery Time**: < 60 seconds (automatic).

### Scenario B: Complete Regional AWS Outage
- **Detection**: Complete Route53 health check failure for primary region.
- **Action**: Update Route53 latency routing policy to direct traffic to standby region.
- **Recovery Time**: < 10 minutes (DNS TTL propagation time).
