# RouteX AWS Production Infrastructure Architecture

This document details the recommended AWS architecture and cloud services mapping for deploying RouteX in an enterprise-grade, high-availability multi-AZ environment.

---

## 🏗️ Architecture Design & Services Mapping

```
                 [ Route53 (DNS) ]
                         │
               [ CloudFront (CDN) ] ──(S3 Public Assets)
                         │ (SSL / HTTPS)
            [ Application Load Balancer ]
             (ALB / Ingress Controller)
                         │
             [ Amazon EKS Cluster ] (Multi-AZ)
            ┌────────────┴────────────┐
    [ routex-frontend ]       [ routex-backend ]
                                 │         │
                   (Prisma ORM) ─┘         └─ (Socket.IO / Cache)
          [ Amazon RDS Postgres ]       [ Amazon ElastiCache Redis ]
```

---

## 1. Compute Layer: Amazon EKS (Elastic Kubernetes Service)
- **Cluster Configuration**: Deploy EKS using Managed Node Groups across 3 Availability Zones (AZs) for high availability.
- **Auto Scaling**: Use EKS Cluster Autoscaler or Karpenter to dynamically scale EC2 instances based on pod resource demands.
- **Ingress Controller**: Deploy the AWS Load Balancer Controller to automatically provision an AWS ALB from Kubernetes Ingress manifests.

---

## 2. Database Layer: Amazon RDS PostgreSQL
- **Multi-AZ Deployment**: Run RDS in Multi-AZ configuration to support failover.
- **Instance Class**: `db.m6g.xlarge` (or larger) to support concurrent transactions.
- **Storage**: Provisioned IOPS SSD (gp3) to handle bulk booking transactions and write peaks.
- **Connection Pools**: Utilize RDS Proxy to manage database connection pools from serverless or containerized backends.

---

## 3. Cache Layer: Amazon ElastiCache for Redis
- **Configuration**: Deploy ElastiCache Redis in Cluster Mode with Replication enabled (1 primary node + 1 replica node in separate AZs).
- **Usage**: Used for Socket.IO adapter scaling, geofence lookups, and session store caching.

---

## 4. Static Assets & CDN: Amazon S3 & CloudFront
- **Public Uploads**: Store ePOD signatures, company tax documents, and driver licenses in private Amazon S3 buckets.
- **Access Policies**: Generate AWS S3 pre-signed URLs with expirations (e.g. valid for 15 minutes) to protect sensitive KYC documents.
- **CloudFront CDN**: Expose public web assets and images through CloudFront with HTTPS caching.

---

## 5. Security & Secrets Management
- **AWS Secrets Manager**: Integrate with EKS via the Secrets Store CSI Driver. Mount secrets (database URLs, JWT keys, Firebase JSON accounts) directly as environment variables in the pod pods on start.
- **ACM SSL**: Issue certificates for RouteX domains via AWS Certificate Manager (ACM) and associate them with the ALB.
- **IAM Policies**: Configure IAM Roles for Service Accounts (IRSA) to grant pods narrow permissions (e.g. only backend pod can talk to the S3 bucket).
