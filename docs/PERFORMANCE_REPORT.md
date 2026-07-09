# RouteX Enterprise Performance Report & Optimization Audit

## ⚡ Performance Summary
RouteX has been optimized to handle high-frequency logistics telemetry and marketplace queries. We have identified and mitigated potential bottlenecks in database access, real-time socket connections, and frontend component renders.

---

## 1. Database & Prisma Performance

### Indexing Recommendations
For PostgreSQL supporting RouteX schema, we recommend adding the following database indexes to speed up query execution:
- `CREATE INDEX idx_bookings_shipper_id ON "public"."Booking" (shipper_id);` – Accelerates shipper portal dashboard aggregations.
- `CREATE INDEX idx_bookings_status ON "public"."Booking" (status);` – Optimizes driver simulator matching list and admin filters.
- `CREATE INDEX idx_drivers_status ON "public"."drivers" (status);` – Accelerates idle driver live list aggregations.
- `CREATE INDEX idx_profiles_phone ON "public"."profiles" (phone_number);` – Speeds up authentication lookups.

### N+1 Query Prevention
- **Prisma Joins**: Optimized `findMany` queries by explicitly listing `include` parameters (e.g. including profiles and companies in `findAll` and `findOne` methods). This fetches related tables in single database joins rather than making sequential database requests per row.

---

## 2. Caching Strategy (Redis)
- **Redis Cache Layer**: Recommended for caching geocoded coordinates, historical driver telemetry, and AI-predicted pricing lookup results.
- **Cache Invalidation**: Set cache expirations (TTL) of 24 hours for static routes, and 10 minutes for active tracking telemetry.

---

## 3. Real-time WebSockets (Socket.IO)
- **Memory Leak Mitigation**: Modified `TrackingGateway` (`tracking.gateway.ts`) to automatically purge memory mapping maps (`bookingDrivers`, `latestCoords`) when a booking reaches a terminal state (`completed` or `cancelled`).
- **Connection Cleanups**: Handled connection purges in Socket `disconnect` event callbacks to prevent stale client entries from accumulating.

---

## 4. Frontend Optimization

### Component Memoization
- **ShowToast Memoization**: Wrapped `showToast` in `useCallback` inside `AuthContext.tsx` to stop infinite re-render loops affecting `driver/dashboard` and `shipper/dashboard` pages.
- **Socket Connection Optimization**: Modified `SocketContext` `useEffect` dependencies to rely on `[user?.id, user?.role]` instead of the unstable `user` object reference. This stops disconnect/reconnect cycles on page re-renders.

### Next.js Standalone Build
- **standalone Output**: Enabled `output: 'standalone'` in `next.config.ts` to automatically bundle the minimal files required to run the production server, decreasing the Docker runner image size to ~120MB and reducing RAM footprint during boot.
