# SRE Production Architecture — Enterprise Grade Final Design

**System**: Yemen Telecom Management Platform
**Date**: 2026-07-05
**Author**: SRE Architecture Team
**Status**: 🟢 Design Complete — Awaiting Implementation

---

## Table of Contents

1. [High-Level Architecture (6 Layers)](#1-high-level-architecture)
2. [CI/CD Pipeline (Zero-Fail Engineering)](#2-cicd-pipeline)
3. [Deployment Strategy](#3-deployment-strategy)
4. [Observability Stack](#4-observability-stack)
5. [Incident Management System](#5-incident-management-system)
6. [Security Architecture (Zero Trust)](#6-security-architecture)
7. [Performance Engineering](#7-performance-engineering)
8. [Failure Simulation (Chaos Engineering)](#8-failure-simulation)
9. [Scalability Model](#9-scalability-model)
10. [SLO/SLI Definitions](#10-slosli-definitions)
11. [Architecture Guards](#11-architecture-guards)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER (Cloudflare)                         │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐  ┌──────────────────┐   │
│  │  CDN    │  │   WAF    │  │  Rate Limiter  │  │  DDoS Protection │   │
│  │ (static)│  │ (OWASP)  │  │  (per IP/zone) │  │  (L3/L7)        │   │
│  └─────────┘  └──────────┘  └───────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │ TLS 1.3
┌─────────────────────────────────────────────────────────────────────────┐
│                       API GATEWAY LAYER (Kong / Traefik)                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐                 │
│  │ JWT Validate │  │ Route Proxy  │  │ Global Rate   │                 │
│  │ (pre-decoded)│  │ /api/* → app │  │ Limiter +     │                 │
│  │              │  │ / → static   │  │ Request Shape │                 │
│  └──────────────┘  └──────────────┘  └───────────────┘                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER (Render x2 instances)              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Express App (stateless)                        │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐ ┌───────┐ ┌──────────┐   │   │
│  │  │Auth  │ │SIMs  │ │Sellers│ │Agents │ │Admin  │ │Reports   │   │   │
│  │  │Module│ │Module│ │Module │ │Module │ │Module │ │Module    │   │   │
│  │  └──────┘ └──────┘ └──────┘ └───────┘ └───────┘ └──────────┘   │   │
│  │                                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐     │   │
│  │  │  Middleware Pipeline (ordered):                          │     │   │
│  │  │  Metrics → Correlation → Auth → CSRF → RateLim → Routes │     │   │
│  │  └─────────────────────────────────────────────────────────┘     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐    │
│  │   Instance A (live)          │  │   Instance B (standby)       │    │
│  │   Port 4000                  │  │   Port 4001                  │    │
│  └──────────────────────────────┘  └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER (Supabase PostgreSQL)                 │
│                                                                         │
│  ┌────────────────────┐    ┌────────────────────┐                       │
│  │  Primary (RW)      │    │  Replica (RO)      │                       │
│  │  - All writes      │    │  - Read queries    │                       │
│  │  - Transactions    │◄──►│  - Reports         │                       │
│  │  - Migrations      │    │  - Dashboard       │                       │
│  └────────────────────┘    └────────────────────┘                       │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  PgBouncer (connection pooling) — port 6432                     │   │
│  │  - transaction mode (reset after each COMMIT/ROLLBACK)          │   │
│  │  - max 25 pool connections → 100 client connections             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY LAYER (Grafana Cloud)                   │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Prometheus   │  │  Loki        │  │  Tempo       │                   │
│  │  (Metrics)    │  │  (Logs)      │  │  (Traces)    │                   │
│  │  Pull from    │  │  Push from   │  │  OTLP from   │                   │
│  │  /api/metrics │  │  stdout/json │  │  OpenTelemetry│                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
│         │                  │                  │                          │
│         └──────────────────┴──────────────────┘                          │
│                        │                                                │
│             ┌─────────────────────┐                                     │
│             │  Grafana Dashboards │                                     │
│             │  - System Health    │                                     │
│             │  - Business Metrics │                                     │
│             │  - Latency Heatmap  │                                     │
│             │  - Error Dashboard  │                                     │
│             └─────────────────────┘                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                      RELIABILITY LAYER (SRE Core)                        │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ Circuit   │  │ Retry    │  │ Bulkhead │  │ Graceful │                │
│  │ Breaker   │  │ (3+1)   │  │ (per     │  │ Degrade  │                │
│  │ (5 fails) │  │          │  │  domain) │  │ (fallback│                │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Alert Manager: PagerDuty + Discord + Email                     │   │
│  │  S1 → immediate page, S2 → 5min page, S3 → ticket, S4 → log    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Technology | Responsibility | Current State | Gap |
|-------|-----------|----------------|---------------|-----|
| Edge | Cloudflare | CDN, WAF, DDoS, TLS | ❌ None → Add Cloudflare | NEW |
| Gateway | Kong/Traefik | JWT pre-verify, routing, global limit | ❌ None → Add Kong | NEW |
| Application | Express x2 | Business logic, RBAC, API | ✅ Existing | SCALE |
| Data | Supabase PG + PgBouncer | ACID compliance, read replica | ✅ PG exists ❌ No PgBouncer | UPGRADE |
| Observability | Grafana Cloud (Prometheus+Loki+Tempo) | Metrics + Logs + Traces | ❌ Partial → Full | UPGRADE |
| Reliability | Custom middleware + AlertManager | Circuit breaker, retry, bulkhead | ❌ None → Add | NEW |

---

## 2. CI/CD Pipeline

### Pipeline Flow (7 stages, sequential + parallel groups)

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Commit   │────►│  Lint &  │────►│  Unit &  │
│  push     │     │  Typecheck│     │  Integ.  │
│  main/PR  │     │  (3min)  │     │  Tests   │
└──────────┘     └──────────┘     │  (5min)  │
                                  └──────────┘
                                       │
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                   ┌──────────┐ ┌──────────┐ ┌──────────┐
                   │  E2E     │ │ Security │ │  Load    │
                   │Playwright│ │ Audit    │ │  Test k6 │
                   │ (10min)  │ │ (2min)   │ │ (5min)   │
                   └──────────┘ └──────────┘ └──────────┘
                          │            │            │
                          └────────────┼────────────┘
                                       ▼
                               ┌──────────────┐
                               │  Docker Build │
                               │  + Push       │
                               │  (3min)       │
                               └──────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │  Deploy to    │
                               │  Staging      │
                               │  (blue/green  │
                               │   verify)     │
                               └──────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │  Canary to    │
                               │  Production   │
                               │  5%→25%→100% │
                               └──────────────┘
                                       │
                                       ▼
                               ┌──────────────┐
                               │  Post-Deploy  │
                               │  Health Check │
                               │  + Metrics    │
                               └──────────────┘
```

### Stage Details

#### Stage 1: Lint & Typecheck (3min)
```yaml
# Frontend
npx tsc --noEmit
npx eslint src/ --max-warnings 0

# Backend
cd server && npx tsc --noEmit && cd ..
npx eslint server/src/ --max-warnings 0
```

#### Stage 2: Tests (5min)
```yaml
# Unit + Integration
npx vitest run --reporter=verbose --coverage

# Gate: coverage thresholds
#   branches >= 60%, lines >= 70%, statements >= 70%, functions >= 60%
```

#### Stage 3: E2E (10min)
```yaml
# Playwright — 60 critical tests
npx playwright test qa-tests/e2e-final-certification.spec.cjs

# Gate: 0 failures allowed
```

#### Stage 4: Security (2min)
```yaml
# npm audit (both frontend + server)
npm audit --audit-level=moderate
cd server && npm audit --audit-level=moderate && cd ..

# Secret scan
! grep -r -E '(PRIVATE KEY|ghp_|AKIA[0-9A-Z]{16}|sk_live_)' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.yml' --include='*.yaml' --include='*.json' --include='*.sql' --exclude-dir=node_modules --exclude-dir=.github

# Math.random audit
! grep -rl "Math.random()" server/src/routes/ server/src/middleware/ server/src/db.ts

# Pagination audit (unbounded SELECT *)
npx tsx scripts/pagination-audit.ts

# Trivy container scan (HIGH+CRITICAL fails)
trivy image yemen-telecom:latest --severity HIGH,CRITICAL --exit-code 1
```

#### Stage 5: Load Test — k6 (5min) — MANDATORY GATE
```javascript
// qa-tests/load-test.js — upgraded for CI
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp up
    { duration: '30s', target: 50 },   // moderate load
    { duration: '30s', target: 100 },  // peak
    { duration: '30s', target: 200 },  // high load
    { duration: '30s', target: 500 },  // stress
    { duration: '30s', target: 100 },  // recovery
    { duration: '30s', target: 0 },    // cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>50'],  // minimum throughput
  },
};
```

**CI Gate**: If k6 thresholds fail → pipeline FAILS → no deploy.
**Evidence saved as artifact**: `load-test-results.json` (summary + thresholds).

#### Stage 6: Docker Build (3min)
```yaml
# Multi-stage build + cache
docker build \
  --cache-from yemen-telecom:latest \
  -t yemen-telecom:${{ github.sha }} \
  -t yemen-telecom:latest \
  .

# Push to registry (Docker Hub / GHCR)
docker push yemen-telecom:${{ github.sha }}
```

#### Stage 7: Deploy + Post-Deploy Verify (5min)
```yaml
# Blue-Green switch on Render
# 1. Deploy new image to standby instance
# 2. Run health check against standby
# 3. Run smoke tests against standby
# 4. Switch traffic to standby (now live)
# 5. Old live becomes new standby

# Rollback condition (any of):
#   - /api/health returns != 200
#   - error rate spike > 5% in first 60s
#   - p95 latency > 3s in first 60s
#   - DB connection failures
```

### CI/CD Gates Summary

| Gate | Enforcement | Failure Action |
|------|-------------|----------------|
| Lint | `--max-warnings 0` | Pipeline stop |
| TypeScript | `--noEmit` | Pipeline stop |
| Unit Tests | coverage ≥ 60% | Pipeline stop |
| E2E Tests | 0 failures | Pipeline stop |
| Security | npm audit + secret scan | Pipeline stop |
| Load Test | k6 thresholds (p95<2s, errors<1%) | Pipeline stop |
| Container | Trivy HIGH+CRITICAL = exit 1 | Pipeline stop |
| Deploy | Health check + smoke tests | Auto-rollback |

---

## 3. Deployment Strategy

### Architecture: Dual-Instance Blue-Green

```
                    ┌────────────────────────────────────┐
                    │        Render Load Balancer         │
                    │  (internal — free plan uses 1 inst) │
                    └────────────────────────────────────┘
                             │              │
                    ┌────────▼──┐    ┌──────▼────────┐
                    │ Instance A │    │  Instance B   │
                    │ (live)     │    │  (standby)    │
                    │ port 4000  │    │  port 4001    │
                    │            │    │               │
                    │ /api/health│    │ /api/health   │
                    │ metrics    │    │ metrics       │
                    └────────────┘    └───────────────┘
                             │              │
                    ┌────────▼──────────────▼────────┐
                    │      Supabase PostgreSQL        │
                    │      (single endpoint)          │
                    └─────────────────────────────────┘
```

### Blue-Green Switch (Render — Starter Plan Workaround)

Since Render free/starter plan allows only 1 web service:
```
Phase 1: Single Instance (current → migration)
  ├── Blue = instance A (live)
  └── Green = same instance, new Docker tag

Phase 2: Manual swap
  1. Deploy new Docker image with tag :blue
  2. Render auto-deploys (30s downtime unavoidable on free plan)
  3. Health check passes → done
  4. Rollback: re-deploy previous tag

Phase 3: Paid plan (2+ instances)
  1. Deploy new image to standby instance
  2. Health check standby
  3. Switch DNS / load balancer
  4. Zero-downtime achieved
```

### Canary Steps (Paid Plan)

| Step | Traffic % | Duration | Validation |
|------|-----------|----------|------------|
| Canary A | 5% | 3 min | Error rate < 1%, p95 < 1s |
| Canary B | 25% | 5 min | Error rate < 1%, p95 < 2s |
| Canary C | 50% | 5 min | Error rate < 1%, p95 < 2s |
| Full | 100% | — | Health check + metrics |

### Rollback Triggers (Automated)

```yaml
# deploy.yml — rollback conditions
rollback_conditions:
  - metric: http_errors_total
    threshold: "rate > 5% over 60s"
  - metric: http_request_duration_ms
    threshold: "p95 > 3000ms over 60s"
  - metric: db_pool_waiting
    threshold: "> 5 for 30s"
  - check: /api/health
    threshold: "status != 200"
```

---

## 4. Observability Stack

### 4.1 Metrics (Prometheus)

**Current**: In-memory metrics at `GET /api/metrics` (Prometheus text format)
**Upgrade**: Push to Prometheus via remote write or pull from `/api/metrics`

#### Metric Cardinality Plan

| Metric Name | Type | Labels | Retention |
|-------------|------|--------|-----------|
| `http_requests_total` | Counter | method, path, status_code | 30d |
| `http_request_duration_ms` | Histogram | method, path (buckets: 5,10,25,50,100,250,500,1000,2500,5000) | 30d |
| `http_requests_inflight` | Gauge | — | 30d |
| `http_errors_total` | Counter | method, path | 30d |
| `db_pool_total` | Gauge | — | 30d |
| `db_pool_idle` | Gauge | — | 30d |
| `db_pool_waiting` | Gauge | — | 30d |
| `db_queries_total` | Counter | operation (SELECT/INSERT/UPDATE/DELETE) | 30d |
| `db_slow_queries_total` | Counter | table | 30d |
| `auth_login_attempts_total` | Counter | success/failure | 30d |
| `auth_lockouts_total` | Counter | — | 30d |
| `business_sims_active` | Gauge | operator | 30d |
| `business_sellers_total` | Gauge | status | 30d |
| `business_agents_total` | Gauge | status | 30d |

#### Prometheus Scrape Config
```yaml
# prometheus.yml (on Prometheus server)
scrape_configs:
  - job_name: 'yemen-telecom'
    scrape_interval: 15s
    metrics_path: '/api/metrics'
    scheme: https
    static_configs:
      - targets: ['yemen-telecom-api.onrender.com']
    authorization:
      type: Bearer
      credentials: 'prometheus-token'
```

### 4.2 Logs (Loki)

**Current**: Structured JSON to stdout
**Upgrade**: Ship to Loki via Promtail or Grafana Alloy

#### Log Schema
```json
{
  "level": "info|warn|error|debug",
  "ts": "2026-07-05T12:00:00.000Z",
  "msg": "human readable message",
  "correlationId": "uuid-v4",
  "requestId": "uuid-v4",
  "userId": 123,
  "role": "manager|agent|seller",
  "path": "/api/sims",
  "method": "GET",
  "statusCode": 200,
  "duration": 45,
  "errorId": "a1b2c3d4",
  "data": {}
}
```

#### Log Shipping (Promtail config)
```yaml
# promtail.yml
scrape_configs:
  - job_name: yemen-telecom
    static_configs:
      - targets: ['localhost']
        labels:
          job: yemen-telecom
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            correlationId: correlationId
      - labels:
          level:
          correlationId:
```

### 4.3 Traces (OpenTelemetry — CRITICAL UPGRADE)

**Current**: ❌ None
**Target**: Full distributed tracing with OpenTelemetry

#### Implementation

```bash
# Install OpenTelemetry packages
npm install @opentelemetry/api @opentelemetry/sdk-node \
  @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express \
  @opentelemetry/instrumentation-pg @opentelemetry/exporter-trace-otlp-http
```

```typescript
// server/src/tracing.ts — NEW FILE
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'yemen-telecom-api',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://tempo-prod-01.grafana.net:443',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${process.env.GRAFANA_USER}:${process.env.GRAFANA_API_KEY}`).toString('base64')}`,
    },
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PgInstrumentation(),
  ],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

#### Trace Context Propagation

- W3C Trace Context via `traceparent`/`tracestate` headers
- Correlation ID maps to `span_id` in trace
- Every request has: API Gateway → Express → DB query span chain
- Frontend API calls propagate via `fetch` with `traceparent` header

### 4.4 Dashboards (Grafana)

#### Dashboard 1: System Health
```
┌─────────────────────────────────────────────────────────────────┐
│ System Health Dashboard (auto-refresh: 30s)                     │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│ │ Uptime       │ │ Request Rate  │ │ Error Rate   │ │ DB Pool │ │
│ │ 99.9% (30d)  │ │ 45 req/s     │ │ 0.2%         │ │ 8/10    │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌───────────────────────┐│
│ │ HTTP Request Rate (1h)              │ │ Error Rate (1h)      ││
│ │ [area chart: req/s by status code]  │ │ [area chart: % 5xx]  ││
│ └─────────────────────────────────────┘ └───────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌───────────────────────┐│
│ │ Latency p95/p99 (1h)               │ │ DB Pool Connections   ││
│ │ [line chart: ms over time]         │ │ [stacked: total/idle]  ││
│ └─────────────────────────────────────┘ └───────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### Dashboard 2: Business Metrics
```
┌─────────────────────────────────────────────────────────────────┐
│ Business Dashboard (auto-refresh: 5min)                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│ │ Active SIMs  │ │ Sellers      │ │ Agents       │ │ Revenue  │ │
│ │ 12,450       │ │ 89           │ │ 12           │ │ $45.2K  │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ ┌───────────────────────┐│
│ │ SIMs by Operator                    │ │ SIMs by Status        ││
│ │ [pie chart: YOU/MTN/Sabafon]       │ │ [pie chart: active/..]││
│ └─────────────────────────────────────┘ └───────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

#### Dashboard 3: Latency Heatmap
- Request duration by path (heatmap over time)
- Slowest endpoints (top 10)
- DB query performance (top 10 slowest queries)

#### Dashboard 4: SLO Compliance
- Uptime over 30d
- Latency SLO compliance (p95 < 300ms %)
- Error budget remaining
- Deployment success rate

### 4.5 Alerts (Grafana Alerting)

| Alert Name | Condition | Severity | Channel |
|-----------|-----------|----------|---------|
| `HighErrorRate` | `rate(http_errors_total[5m]) > 0.05` | S1 | PagerDuty + Discord |
| `HighLatency` | `p95(http_request_duration_ms[5m]) > 3000` | S2 | PagerDuty + Discord |
| `DBSaturation` | `db_pool_waiting > 5` | S2 | PagerDuty + Discord |
| `AuthAnomaly` | `rate(auth_failures[5m]) > 10` | S2 | Discord |
| `LowUptime` | `up == 0` | S1 | PagerDuty + Discord |
| `MemoryPressure` | `process_memory_usage > 400MB` | S3 | Discord |
| `DeployFailed` | deploy health check fail | S1 | PagerDuty + Discord |
| `CertExpiry` | TLS cert < 7 days | S3 | Discord |

---

## 5. Incident Management System

### 5.1 Severity Classification

| Level | Definition | Examples | Response Time | RTO | RPO |
|-------|-----------|----------|---------------|-----|-----|
| **S1** | System down / data loss | DB crash, total outage, auth broken | 5 min | 1 hour | 5 min |
| **S2** | Major degradation | High latency, partial outage, feature broken | 15 min | 4 hours | 15 min |
| **S3** | Partial issue | Minor feature broken, slow page, UI glitch | 1 hour | 24 hours | — |
| **S4** | Minor issue | Cosmetic, typo, non-critical bug | Next sprint | Next sprint | — |

### 5.2 Incident Lifecycle

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Detection│──►│ Triage   │──►│ Mitigate │──►│ Resolve  │──►│ Postmortem│
│          │   │ (severity)│   │ (fix)    │   │ (verify) │   │ (5 whys) │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

### 5.3 Auto-Response Matrix

| Trigger | S1 Auto | S2 Auto | S3 Auto | S4 Auto |
|---------|---------|---------|---------|---------|
| Error rate > 5% | Rollback + Page | Alert + Log | Log | — |
| Latency p95 > 3s | Rollback + Page | Scale + Alert | Log | — |
| DB connection fail | Restart + Page | Alert | — | — |
| Auth failures spike | Block source + Page | Rate-limit + Alert | Log | — |
| Deploy health fail | Rollback + Page | — | — | — |
| Memory > 400MB | Restart + Page | Alert | Log | — |

### 5.4 Runbooks

#### Runbook 1: DB Failure
```yaml
id: RB-DB-001
title: Database Connection Failure
severity: [S1, S2]
steps:
  1. Check DB pool status: GET /api/admin/monitoring
  2. Check Supabase dashboard for outages
  3. Verify connection string env vars are correct
  4. Restart service: Render Dashboard → Deploy
  5. If replica exists: PROMOTE REPLICA TO PRIMARY
  6. If persistent: FAILOVER to backup region
verification:
  - pool.totalCount > 0
  - /api/health returns 200
  - Transactions commit successfully
rollback:
  - Promote previous primary back
```

#### Runbook 2: Auth Outage
```yaml
id: RB-AUTH-001
title: Authentication Service Failure
severity: S1
steps:
  1. Check /api/health (should be up)
  2. Check JWT_SECRET env var is set
  3. Check token_blacklist cleanup cron ran
  4. Check rate limiters haven't blocked legitimate traffic
  5. Try login as manager from fresh browser
  6. Check Sentry for auth errors
  7. If CSRF issue: verify CSRF_SECRET match
  8. Force token cleanup: DELETE FROM token_blacklist
verification:
  - Login succeeds
  - Token refresh succeeds
  - All roles can authenticate
```

#### Runbook 3: High Latency
```yaml
id: RB-PERF-001
title: API Latency Spike
severity: S2
steps:
  1. Check Grafana latency dashboard (p95 by path)
  2. Identify slowest endpoint
  3. Check DB slow query log (>500ms)
  4. Check connection pool saturation
  5. Check if missing index: EXPLAIN ANALYZE on slow query
  6. Add index if needed (online, CONCURRENTLY)
  7. If memory pressure: restart instance
  8. If sustained: scale to larger instance
verification:
  - p95 < 500ms
  - No slow queries in logs
  - DB pool waiting < 2
```

#### Runbook 4: Deployment Failure
```yaml
id: RB-DEPLOY-001
title: Deployment Health Check Failed
severity: S1
steps:
  1. Check deploy logs for error messages
  2. Verify health check endpoint returns 200
  3. Check DB migrations ran successfully
  4. Check env vars are set on new instance
  5. If migration failed: check migration 0XX status
  6. If config error: fix env vars → redeploy
  7. If code error: rollback to previous image
  8. Manual rollback: Render Dashboard → Deploy previous version
verification:
  - Health endpoint returns 200
  - E2E smoke test passes
  - Metrics reporting correctly
```

---

## 6. Security Architecture (Zero Trust)

### 6.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS (defense-in-depth)                │
│                                                                     │
│  Layer 1: Edge (Cloudflare WAF)                                     │
│  ├── OWASP Core Rule Set (CRS)                                      │
│  ├── Rate limiting per IP (100 req/s)                               │
│  ├── DDoS protection (L3/L7)                                        │
│  ├── TLS 1.3 only, HSTS preload                                     │
│  └── Bot management                                                 │
│                                                                     │
│  Layer 2: API Gateway (Kong)                                        │
│  ├── JWT pre-validation (before backend)                            │
│  ├── Global rate limit (1000 req/min per tenant)                    │
│  ├── IP allowlist/blocklist                                         │
│  ├── Request size limit (1MB)                                       │
│  └── CORS strict enforcement                                        │
│                                                                     │
│  Layer 3: Application (Express)                                     │
│  ├── JWT verify with algorithm lock (HS256)                         │
│  ├── RBAC: requireRole('manager'|'agent'|'seller')                 │
│  ├── CSRF: HMAC-SHA256 + timingSafeEqual                            │
│  ├── CSP: nonce-based, no unsafe-inline                             │
│  ├── Input validation: Zod schemas                                  │
│  ├── Rate limiting: 8 layers (auth, refresh, write, admin, etc.)    │
│  ├── Parameterized queries: all SQL                                 │
│  └── Helmet security headers                                        │
│                                                                     │
│  Layer 4: Data (PostgreSQL)                                         │
│  ├── Connection SSL enforced (rejectUnauthorized: true in prod)     │
│  ├── Prepared statements only (no dynamic SQL)                      │
│  ├── Row-level security via WHERE agent_id = $1                     │
│  ├── ACID transactions with FOR UPDATE                              │
│  ├── Token blacklist cleanup (hourly cron)                          │
│  └── Sensitive data: password_hash never returned                   │
│                                                                     │
│  Layer 5: CI/CD                                                     │
│  ├── npm audit (moderate+ fails)                                    │
│  ├── Secret scan (keys, tokens in code → fail)                     │
│  ├── Trivy container scan (HIGH+CRITICAL → fail)                    │
│  ├── CodeQL security analysis                                       │
│  └── Dependency updates (Dependabot weekly)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 JWT Architecture

```typescript
// Current (HS256) → upgrade to RS256 for multi-service
// server/src/middleware/auth.ts
import jwt from 'jsonwebtoken';

// Step 1: RS256 key pair generation
// openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
// openssl rsa -pubout -in private.pem -out public.pem

// Step 2: JWT verify with public key only (Kong can verify too)
const PUBLIC_KEY = fs.readFileSync(path.resolve(__dirname, '../../keys/public.pem'), 'utf8');

function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  jwt.verify(token, PUBLIC_KEY, {
    algorithms: ['RS256'],
    issuer: 'yemen-telecom',
  }, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = decoded as JwtPayload;
    next();
  });
}
```

### 6.3 CSRF Protection (enhanced)

```typescript
// Current: HMAC-SHA256 with timingSafeCompare ✅
// Enhancement: Add double-submit cookie pattern

// index.ts:173-196 — enhanced
app.get('/api/csrf-token', (_req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', CSRF_SECRET).update(token).digest('hex');
  // Set as httpOnly cookie (double submit)
  res.cookie('csrf-token', hash, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000,
    path: '/',
  });
  res.json({ token, hash });
});
```

### 6.4 Security Headers (helmet upgrade)

```typescript
app.use(helmet({
  contentSecurityPolicy: false, // handled manually for nonce
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  originAgentCluster: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: {
    maxAge: 63072000,  // 2 years
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true,
  xDnsPrefetchControl: { allow: true },
  xDownloadOptions: true,
  xFrameOptions: { action: 'deny' },
  xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
  xPoweredBy: false,  // explicit
  xXssProtection: true,
}));
```

---

## 7. Performance Engineering

### 7.1 Query Optimization

#### Current Index Analysis
```sql
-- Add missing indexes for high-frequency queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sims_agent_id ON sims(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sims_assigned_to ON sims(assigned_to);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sims_status ON sims(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sims_created_at ON sims(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_agent_id ON sellers(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operations_agent_id ON operations(agent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created_by ON customers(created_by);
```

#### Slow Query Detection
```typescript
// server/src/db.ts — slow query logging (current: 500ms default)
// Upgrade: log to dedicated slow_query_log table
await query(`
  INSERT INTO slow_query_log (query_text, duration_ms, params_hash, timestamp)
  VALUES ($1, $2, $3, NOW())
`, [queryText, duration, simpleHash(params)]);
```

### 7.2 Caching Strategy

| Cache Level | Type | Max Size | TTL | Contents | Eviction |
|-------------|------|----------|-----|----------|----------|
| L1 | In-memory (current) | 1000 entries | 5 min (stats), 2 min (reports) | Dashboard stats, reports | FIFO |
| L2 | Redis (NEW) | 512MB | configurable | Token blacklist, session cache, rate limit state | LRU |
| L3 | CDN (Cloudflare) | ∞ | 1 year (static) | `/assets/*`, `/dist/*` | Cache purge |

#### Redis Integration (NEW)
```typescript
// server/src/redis.ts
import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;

export async function initRedis() {
  if (!process.env.REDIS_URL) return;
  redisClient = createClient({ url: process.env.REDIS_URL });
  await redisClient.connect();
  logger.info('[REDIS] Connected');
}

export async function redisGet(key: string): Promise<string | null> {
  if (!redisClient) return null;
  return redisClient.get(key);
}

export async function redisSet(key: string, value: string, ttlSeconds = 300) {
  if (!redisClient) return;
  await redisClient.setEx(key, ttlSeconds, value);
}

// Use as fallback for in-memory cache
export async function cacheGet(key: string): Promise<any> {
  const mem = inMemoryGet(key);
  if (mem !== undefined) return mem;
  const remote = await redisGet(key);
  if (remote) {
    inMemorySet(key, JSON.parse(remote), 60); // short TTL for mem
    return JSON.parse(remote);
  }
  return null;
}
```

### 7.3 Pagination Enforcement (global)

```typescript
// server/src/middleware/paginationGuard.ts — already exists ✅
// Verified: all routes use getPagination() from helpers.ts
// Limits: paginationGuard caps at 500, helpers cap at 200
// Fix: unify to single limit (value = 200)

// helpers.ts
export function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
```

### 7.4 Connection Pool Configuration

```typescript
// server/src/db.ts — current pool config
const poolConfig = {
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),  // upgrade to 25
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '15000'),
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
};
```

---

## 8. Failure Simulation (Chaos Engineering)

### 8.1 Chaos Test Scenarios

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAOS EXPERIMENTS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Experiment 1: DB CRASH                                         │
│  ├── Action: Kill PostgreSQL process                            │
│  ├── Expected: Health check fails → alert → auto-reconnect      │
│  ├── Validation: API returns 503, client shows error            │
│  ├── Recovery: DB restart, connection pool rehydration          │
│  └── RTO Target: < 5 min                                        │
│                                                                 │
│  Experiment 2: NETWORK LATENCY                                  │
│  ├── Action: Inject 2s latency to DB (tc/netem)                │
│  ├── Expected: Slow queries → timeout → circuit breaker         │
│  ├── Validation: p95 spikes, pool waits, fallback triggers      │
│  ├── Recovery: Remove latency injection                         │
│  └── RTO Target: < 30s after removal                            │
│                                                                 │
│  Experiment 3: CPU PRESSURE                                     │
│  ├── Action: Stress CPU to 80%+ (stress-ng)                    │
│  ├── Expected: Request latency increases, no crashes            │
│  ├── Validation: Auto-scaling triggers (if configured)          │
│  ├── Recovery: Stop CPU stress                                  │
│  └── RTO Target: < 2min after stress end                        │
│                                                                 │
│  Experiment 4: MEMORY EXHAUSTION                                │
│  ├── Action: Allocate memory until OOM threshold                │
│  ├── Expected: Oldest GC, then crash, then restart              │
│  ├── Validation: Process restarts, metrics reset                │
│  ├── Recovery: Auto-restart (Docker restart policy)             │
│  └── RTO Target: < 30s                                         │
│                                                                 │
│  Experiment 5: SERVICE RESTART LOOP                             │
│  ├── Action: Kill process every 60s                             │
│  ├── Expected: Consecutive restarts detected, circuit breaks    │
│  ├── Validation: Alert triggers, DB connections drain           │
│  ├── Recovery: Stop kill cycle, wait for stabilization          │
│  └── RTO Target: < 2min                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Chaos Automation (CI Pipeline)

```yaml
# .github/workflows/chaos.yml
name: Chaos Engineering
on:
  schedule:
    - cron: '0 6 * * 1'  # Monday 6:00 UTC
  workflow_dispatch:

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - name: Run DB Chaos
        run: |
          # Kill PG connection pool, verify recovery
          docker exec postgres kill -9 $(pgrep postgres)
          sleep 30
          # Verify auto-recovery
          ./scripts/verify-health.sh

      - name: Run Latency Chaos
        run: |
          # Inject latency to DB queries
          docker exec app tc qdisc add dev eth0 root netem delay 2000ms
          sleep 60
          # Measure impact
          k6 run qa-tests/load-test.js --threshold "http_req_duration{p(95)}<5000"
          # Remove latency
          docker exec app tc qdisc del dev eth0 root

      - name: Report Results
        run: |
          echo "| Experiment | Status | RTO |" >> $GITHUB_STEP_SUMMARY
          echo "|-----------|--------|-----|" >> $GITHUB_STEP_SUMMARY
          # Parse results...
```

### 8.3 RTO/RPO Targets

| Failure Scenario | RTO Target | RPO Target | Verification Method |
|-----------------|-----------|-----------|-------------------|
| Single instance crash | < 30s | 0 (stateless) | Instance restart |
| DB connection failure | < 5 min | < 1 min | Auto-reconnect |
| Full DB crash | < 30 min | < 5 min | Replica promotion |
| Region outage | < 1 hour | < 15 min | DNS failover |
| Deployment failure | < 2 min | 0 | Rollback |
| Memory OOM | < 30s | 0 | Auto-restart |

---

## 9. Scalability Model

### 9.1 Horizontal Scaling

```
                       ┌──────────────────────┐
                       │  Cloudflare Load      │
                       │  Balancer (DNS-based) │
                       └──────────────────────┘
                              │         │
                    ┌─────────▼──┐ ┌─────▼─────────┐
                    │  Kong       │ │  Kong          │
                    │  Gateway A  │ │  Gateway B     │
                    │  (active)   │ │  (active)      │
                    └─────────┬──┘ └─────┬──────────┘
                              │         │
         ┌────────────────────┼─────────┼────────────────────┐
         │                    │         │                     │
    ┌────▼───┐          ┌────▼───┐ ┌───▼────┐          ┌────▼───┐
    │ App    │          │ App    │ │ App    │          │ App    │
    │ Inst 1 │◄────────►│ Inst 2 │ │ Inst 3 │◄────────►│ Inst 4 │
    │ (web)  │          │ (web)  │ │ (api)  │          │ (api)  │
    └────┬───┘          └────┬───┘ └───┬────┘          └────┬───┘
         │                   │         │                     │
         └───────────────────┼─────────┼─────────────────────┘
                             │         │
                    ┌────────▼─────────▼────────┐
                    │      PgBouncer Pool       │
                    │      (transaction mode)   │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  PostgreSQL      │
                    │  Primary (RW)    │
                    └────────┬─────────┘
                             │ streaming replication
                    ┌────────▼─────────┐
                    │  PostgreSQL      │
                    │  Replica (RO)    │
                    └──────────────────┘
```

### 9.2 Scaling Dimensions

| Dimension | Current | Target | Strategy |
|-----------|---------|--------|----------|
| App instances | 1 | 2-4 | Blue-green deploys, horizontal scale |
| DB connections | 10 | 25 | PgBouncer pooling |
| DB read replicas | 0 | 1 | Read-only queries → replica |
| CDN | none | Cloudflare | Static assets + API caching |
| Queue system | none | Bull/BullMQ (optional) | Async tasks (SMS, email) |
| Memory per instance | 512MB | 1GB | Render plan upgrade |

### 9.3 Stateless Design

```typescript
// Current: ✅ already stateless (no local file storage, no in-memory sessions)
//
// Upgrade checklist:
// 1. [✅] JWT tokens — stateless, no server-side sessions
// 2. [✅] Uploads — S3-compatible storage, not local filesystem
// 3. [⚠️] Cache — in-memory → Redis (shared across instances)
// 4. [✅] Metrics — in-memory per instance (acceptable for Prometheus pull)
// 5. [✅] Logs — stdout (shipped by external agent)
// 6. [⚠️] Rate limiter state — in-memory → Redis (sync across instances)
```

### 9.4 Rate Limiter (distributed) — NEW

```typescript
// server/src/middleware/rateLimiter.ts
// Current: express-rate-limit in-memory → Upgrade: Redis-backed

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../redis';

export const apiLimiter = rateLimit({
  store: redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient!.sendCommand(args),
    prefix: 'rl:api:',
  }) : undefined,
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
```

---

## 10. SLO/SLI Definitions

### 10.1 Service Level Indicators (SLIs)

| SLI | Definition | Measurement | Target | Source |
|-----|-----------|-------------|--------|--------|
| **Availability** | `(total_requests - 5xx_errors) / total_requests` | Prometheus `http_requests_total{status=~"5.."} / http_requests_total` | ≥ 99.9% | Metrics |
| **Latency (p95)** | p95 of `http_request_duration_ms` over 5min window | Prometheus histogram_quantile(0.95, ...) | ≤ 300ms | Metrics |
| **Latency (p99)** | p99 of `http_request_duration_ms` over 5min window | Prometheus histogram_quantile(0.99, ...) | ≤ 1000ms | Metrics |
| **Error Rate** | `5xx_requests / total_requests` over 5min | Prometheus `rate(http_errors_total[5m]) / rate(http_requests_total[5m])` | < 1% | Metrics |
| **DB Saturation** | `db_pool_waiting` gauge | Prometheus `avg(db_pool_waiting)` | < 2 | Metrics |
| **Deploy Success** | Successful deploys / total deploys | GitHub Actions API | ≥ 99% | CI/CD |

### 10.2 Service Level Objectives (SLOs)

| SLO | Period | Target | Error Budget | Burn Rate Alert |
|-----|--------|--------|-------------|-----------------|
| Uptime | Monthly | 99.9% | 43 min/month | 10% used in 1h |
| p95 Latency | Monthly | 95% of requests ≤ 300ms | 5% fast-fail | 20% used in 1h |
| Error Rate | Monthly | 99% of 5min windows ≤ 1% | 1% bad windows | 25% used in 1h |
| Deploy Success | Monthly | 99% success rate | 1 failed deploy | 1 failure |

### 10.3 Error Budget

```yaml
# Monthly error budget (99.9% availability)
# Total time: 43,200 minutes
# Allowed downtime: 43 minutes
# Allowed errors: 0.1% of total requests

budget:
  total: 43200  # minutes per month
  allowed_downtime: 43  # minutes
  current_remaining: 40  # minutes

  burn_rate_alerts:
    - name: critical-burn
      threshold: "10% budget consumed in 1 hour"
      action: page SRE
    - name: warning-burn
      threshold: "25% budget consumed in 6 hours"
      action: alert team
    - name: slow-burn
      threshold: "50% budget consumed in 48 hours"
      action: log + review
```

### 10.4 Service Level Agreement (SLA)

| Tier | Availability | Latency (p95) | Support Response |
|------|-------------|----------------|-----------------|
| Internal (dev) | 99.0% | < 1000ms | Best effort |
| Production | 99.9% | < 300ms | S1: 5min, S2: 15min |

---

## 11. Architecture Guards

| Guard | Layer | Implementation | Verification |
|-------|-------|---------------|--------------|
| **Auth Guard** | Gateway + App | JWT verification on `/api/*` except `/auth/*` | All routes tested |
| **RBAC Guard** | App | `requireRole('manager','agent','seller')` | Per-route tests |
| **CSRF Guard** | App | HMAC-SHA256 + timingSafeEqual on all POST/PUT/DELETE | Tested in csrf.test.ts |
| **Rate Limit Guard** | App + Edge | 8 layered limiters (auth, write, admin, etc.) | Rate limiter tests |
| **Pagination Guard** | App | Global middleware sets page=1, limit=50 in production | pagination-audit.ts in CI |
| **Query Safety Guard** | App | Parameterized queries only | pagination-audit.ts + code review |
| **Transaction Guard** | App | FOR UPDATE on all mutations | sellers-idor-security.test.ts |
| **Input Validation** | App | Zod schemas on all POST/PUT endpoints | validation.test.ts (88 tests) |
| **CSP Guard** | App | Nonce-based, no unsafe-inline, frame-src 'none' | Helmet + manual CSP header |
| **CORS Guard** | App | Origin-validated, Capacitor-aware | index.ts:116-128 |
| **Secrets Guard** | CI/CD | grep on keys + npm audit + Trivy | CI lint job |
| **Load Guard** | CI/CD | k6 thresholds (p95<2s, errors<1%) | CI load-test job |
| **Migration Guard** | App | Auto-applied, idempotent, error logging + retry | index.ts:586-601 |
| **Token Guard** | App + Data | Refresh rotation + blacklist + periodic cleanup | auth.ts + index.ts:618-627 |

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1) — Current State + Fixes
- [ ] Add Cloudflare CDN + WAF in front of Render
- [ ] Enable HSTS + Permissions-Policy + Referrer-Policy headers
- [ ] Fix pagination limit conflict (500 → 200)
- [ ] Configure `@sentry/vite-plugin` for source maps
- [ ] Wire frontend Sentry user identity
- [ ] Add `X-Correlation-ID` to response headers

### Phase 2: Observability (Week 2) — Metrics + Logs + Traces
- [ ] Add OpenTelemetry SDK + instrumentation (HTTP, Express, PG)
- [ ] Ship logs to Loki (Promtail or Alloy)
- [ ] Configure Prometheus to scrape `/api/metrics`
- [ ] Build 4 Grafana dashboards (system, business, latency, SLO)
- [ ] Configure alerts (PagerDuty + Discord)

### Phase 3: Resiliency (Week 3) — Circuit Breakers + Chaos
- [ ] Add circuit breaker middleware (5 failures → open circuit)
- [ ] Add retry with backoff (3+1 pattern)
- [ ] Add bulkhead per domain (auth, db, external services)
- [ ] Upgrade rate limiter to Redis-backed
- [ ] Add Redis instance (Upstash or Render KV)

### Phase 4: CI/CD (Week 4) — Load Test + Chaos + Blue-Green
- [ ] Execute k6 in CI and verify thresholds pass
- [ ] Save load test results as CI artifact
- [ ] Add chaos engineering workflow (weekly)
- [ ] Upgrade Render plan (starter → pro) for dual instances
- [ ] Implement blue-green deployment

### Phase 5: Production Hardening (Week 5)
- [ ] Final security pentest (OWASP ZAP)
- [ ] Upgrade to RS256 JWT (multi-service)
- [ ] DB read replica setup for reporting queries
- [ ] RTO/RPO validation under chaos
- [ ] Create SLO dashboard with burn-rate alerts

---

## Appendices

### A. Dependency Upgrade Plan

| Library | Current | Target | Reason |
|---------|---------|--------|--------|
| node | 22.14.0 | 22.x LTS | Security patches |
| express | 4.21.0 | 4.x | Security patches |
| pg | 8.13.0 | 8.x | Security patches |
| @sentry/* | 10.62.0 | latest | Bug fixes |
| NEW: @opentelemetry/* | — | latest | Tracing |
| NEW: redis | — | 4.x | Distributed cache |
| NEW: opossum (circuit breaker) | — | latest | Resiliency |

### B. Cost Estimate (Paid Plan)

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Render Web | Starter ×1 | $7 |
| Render Web | Pro ×2 | $40 |
| Render PostgreSQL | Mini ×1 | $7 (free tier → paid) |
| Cloudflare | Free | $0 |
| Grafana Cloud | Free | $0 (up to 10k series) |
| Redis (Upstash) | Free | $0 (256MB) |
| Sentry | Free | $0 (5k events/mo) |
| **Total (paid)** | | **~$54/mo** |

### C. Security Checklist (Pre-Production)

- [ ] All env vars set in Render Dashboard (17 secret vars)
- [ ] `DB_SSL_REJECT_UNAUTHORIZED=true` in production
- [ ] HSTS preload submitted
- [ ] Cloudflare WAF OWASP CRS enabled
- [ ] Rate limit thresholds tuned for expected traffic
- [ ] Sentry source maps configured (vite plugin + release)
- [ ] k6 load test passed in CI
- [ ] Chaos experiment: DB crash recovery < 5min
- [ ] Rollback tested: deploy bad version, verify rollback fires
- [ ] E2E suite passes: `npx playwright test`
