# PocketWardrobe — Platform Architecture

**Feature**: app-deployment-setup
**Wave**: DEVOP
**Date**: 2026-03-01
**Author**: Apex (nw-platform-architect)

---

## 1. Decisions Summary

| Decision | Selection | Rationale |
|----------|-----------|-----------|
| Deployment target | AWS (Lambda + S3 + CloudFront) | Greenfield; serverless avoids instance management; matches team size |
| Container orchestration | Serverless (no containers) | Lambda scales to zero; eliminates Dockerfile/ECR/cluster overhead at MVP stage |
| CI/CD | GitHub Actions | Already hosted there; free tier sufficient; no new tool onboarding required |
| Existing infrastructure | None — greenfield | Confirmed: zero AWS accounts or CI/CD pipelines existed |
| Observability | CloudWatch (AWS-native) | Zero extra cost; Lambda emits metrics automatically; sufficient for MVP monitoring |
| Deployment strategy | Recreate | Simplest viable strategy for a single-digit team in early beta; see rejected alternatives |
| Git branching | Trunk-Based Development | CI on every push to main; short-lived feature branches (<1 day); always releasable |
| Mutation testing | Per-feature | Project < 50k LOC; per-feature scope is fast enough; kill rate gate ≥ 80% |

---

## 2. Rejected Simpler Alternatives

### Alternative 1: Single SAM function handling all routes
- **What**: One Lambda function receives all HTTP requests and dispatches internally (monolith Lambda)
- **Expected impact**: 100% of requirements met technically
- **Why insufficient**: Cold starts affect all routes simultaneously; no per-function memory/timeout tuning; violates hexagonal architecture (single handler imports all use cases); harder to observe individual use case performance

### Alternative 2: No CloudFront, serve thumbnails directly from S3 public URLs
- **What**: S3 bucket with public read access; mobile fetches thumbnails via S3 URL
- **Expected impact**: Eliminates CloudFront setup complexity (~30 min saved)
- **Why insufficient**: S3 egress is billed at $0.09/GB vs CloudFront at $0.0085/GB — 10x more expensive at scale; no global caching; CloudFront free tier covers 1TB/month which covers MVP entirely; GDPR requires restricting public object access

### Alternative 3: Terraform instead of SAM
- **What**: HashiCorp Terraform IaC instead of AWS SAM
- **Expected impact**: More flexible; supports non-Lambda resources natively
- **Why insufficient**: SAM is purpose-built for serverless and 60% less configuration for this use case; Terraform requires remote state setup (S3 + DynamoDB); team is 4 people with no existing Terraform knowledge; SAM integrates directly with AWS CLI and CodeDeploy; revisit at Phase 3 if non-Lambda resources become primary

---

## 3. Local Development Architecture

```
Developer machine
├── Supabase CLI (Docker-backed)
│   ├── PostgreSQL 16 on localhost:54322
│   ├── Auth API on localhost:54321
│   └── Migrations applied via: supabase db push
│
├── Express local server (packages/functions/src/local-server.ts)
│   ├── Started via: pnpm --filter @pocketwardrobe/functions dev
│   ├── Runs on: http://localhost:3000
│   ├── Uses: tsx watch (hot reload on file change)
│   ├── Routes: mirrors API Gateway routes exactly
│   │   ├── POST /style-profile/calibrate
│   │   ├── POST /style-profile/skip
│   │   ├── POST /items/digitize
│   │   ├── POST /items/confirm
│   │   ├── POST /items/correct
│   │   ├── DELETE /items/:itemId
│   │   ├── GET  /outfits/daily
│   │   ├── POST /outfits/accept
│   │   ├── POST /outfits/swap
│   │   └── GET  /health
│   └── DI container: production profile (Supabase adapters + Nano Banana)
│       SUPABASE_URL points to localhost:54321
│
└── Mobile app (separate repo)
    └── Expo Go connects to http://localhost:3000
```

**Environment flag**: `LOCAL=true` activates the Express server. In production this file is never bundled — SAM deploys only the handler files.

**Key design decision**: The local server invokes the same `AppContainer` (production profile) that Lambda uses. No mock adapters in the local server — this catches real integration issues early.

---

## 4. Production Architecture

```
Mobile (Expo React Native)
    │ HTTPS
    ▼
AWS API Gateway (HTTP API, eu-west-1)
    │ JWT RS256 validated against Supabase JWKS endpoint
    │ Rate limit: 10 req/s per user, burst 50 req/s
    ▼
AWS Lambda Functions (nodejs22.x, arm64 Graviton2)
    ├── StyleCalibrationFunction  (256MB, 10s timeout)
    ├── ItemDigitizationFunction  (512MB, 30s timeout)  ← AI path
    ├── OutfitSuggestionFunction  (256MB, 10s timeout)
    └── ScheduledOutfitGenerator  (512MB, 5min timeout) ← EventBridge 06:30 UTC
         │
         ├── Supabase (eu-west-1) ← PostgreSQL 16, Auth, PgBouncer
         ├── AWS S3 (eu-west-1)  ← garment originals + thumbnails
         ├── CloudFront CDN      ← thumbnail delivery (PriceClass_100: EU+NA)
         ├── Nano Banana API     ← AI classification (external, HTTPS)
         └── Open-Meteo API      ← weather forecasts (external, free)
```

**Deployment strategy — Recreate**:

Every deployment is a full Lambda function code update via `sam deploy`. Lambda atomically updates the function version; in-flight requests complete against the previous version (Lambda's built-in behaviour). No traffic shifting, no canary analysis.

Rollback: redeploy previous Git commit via `pnpm --filter @pocketwardrobe/functions deploy:prod`. Lambda also retains previous versions; manual version alias flip possible in < 2 minutes.

Rationale for Recreate over canary/blue-green: MVP stage with < 100 beta users; no SLA requirements justifying traffic shifting complexity; full rollback achievable in < 5 minutes; revisit at Phase 3 (launch) when user base warrants zero-downtime guarantees.

---

## 5. Environment Promotion

```
Local (developer machine)
    │  pnpm test (unit + acceptance)
    │  Manual smoke: curl localhost:3000/health
    ▼
main branch (GitHub)
    │  CI pipeline (GitHub Actions)
    │  lint-and-type-check + unit-tests + acceptance-tests + build
    ▼
Production (AWS Lambda)
    │  sam deploy (manual trigger, from main branch)
    │  Post-deploy: curl <ApiEndpoint>/health
    ▼
Stakeholder validation (manual)
```

There is no staging environment in the MVP. Cost justification: a staging Lambda environment identical to production costs ~$0 (within free tier) but requires separate Supabase project, SSM parameters, and SAM stack — meaningful overhead for a 4-person team. Add staging when change failure rate in production exceeds 15% (DORA High threshold).

---

## 6. CI/CD Pipeline Design

**Branching**: Trunk-Based Development. Feature branches live < 1 day. Direct commits to main allowed with CI protection (status checks required before merge).

**Pipeline triggers**:
- `push` to `main` → full pipeline → production deploy (manual step, not automated in MVP)
- `pull_request` to `main` → full pipeline → merge gate

**Jobs** (all run in parallel unless `needs` dependency declared):

```
lint-and-type-check ──────────────────────────────┐
                                                   ▼
unit-tests ──────────────────────► acceptance-tests ──► build
                                   (needs: lint)        (needs: unit + acceptance)
```

**Quality gates**:
- TSC strict mode: zero type errors
- Domain unit tests: 100% pass rate
- Cucumber smoke: 100% pass rate
- Build: all `dist/` artefacts present

**pnpm caching**: `actions/setup-node@v4` with `cache: pnpm` uses the pnpm store cache keyed on `pnpm-lock.yaml` hash. Restores in ~10s on cache hit.

**Concurrency cancellation**: In-progress runs for the same branch are cancelled on new push — prevents queue buildup during rapid iteration.

---

## 7. Observability Design (CloudWatch)

**Automatic Lambda metrics** (zero configuration required):
- `Duration` (p50, p99) — latency per function
- `Errors` — error count and error rate
- `Throttles` — concurrency limit hits
- `ConcurrentExecutions` — scaling behaviour
- `ColdStarts` — provisioned concurrency effectiveness

**Custom CloudWatch metrics** (emitted from Lambda handlers):
- `ai_correction_rate` per category → alarm if > 25% (BR-10)
- `outfit_acceptance_rate` → target > 40% in week 1
- `digitization_completion_rate` → target > 80% (5 items in session 1)
- `sqs_dlq_depth` → alarm if > 0 (failed AI jobs)

**CloudWatch Alarms** (minimum viable alerting for MVP):

| Alarm | Condition | Action |
|-------|-----------|--------|
| ItemDigitizationErrors | ErrorRate > 5% for 5 min | SNS email to CTO |
| OutfitSuggestionLatency | p99 > 3000ms for 5 min | SNS email to CTO |
| AICorrectRateHigh | `ai_correction_rate` > 0.25 | SNS email to CTO |
| SQSDLQDepth | `ApproximateNumberOfMessagesVisible` > 0 | SNS email to CTO |

**Log format**: Structured JSON (configured in SAM Globals `LoggingConfig`). Each Lambda invocation emits `requestId`, `userId`, `duration`, `statusCode` as top-level JSON fields for easy CloudWatch Insights queries.

**Sample CloudWatch Insights query** (outfit acceptance rate):
```sql
fields @timestamp, userId, accepted
| filter eventType = 'outfit.accepted'
| stats count(*) as accepted, count(*) as total by bin(1d)
| sort @timestamp desc
```

---

## 8. Cost Breakdown — Free Tier Analysis

**Target**: $0/month until ~1,000 MAU.

| Service | Free Tier Limit | MVP Estimate | Buffer |
|---------|----------------|--------------|--------|
| Lambda requests | 1M/month | < 10k | 99% remaining |
| Lambda compute | 400k GB-seconds | < 5k GB-sec | 99% remaining |
| API Gateway (HTTP) | 1M requests/month (12mo) | < 10k | 99% remaining |
| S3 storage | 5GB | < 500MB | 90% remaining |
| S3 GET requests | 20k/month | < 2k | 90% remaining |
| S3 PUT requests | 2k/month | < 200 | 90% remaining |
| CloudFront transfer | 1TB/month | < 1GB | 99.9% remaining |
| CloudWatch metrics | 10 custom/month | 5 custom | 50% remaining |
| CloudWatch logs | 5GB/month | < 500MB | 90% remaining |
| Supabase DB | 500MB | < 50MB | 90% remaining |
| Supabase API requests | 50k/month | < 5k | 90% remaining |
| GitHub Actions | 2,000 min/month | < 200 min | 90% remaining |

**First cost trigger**: Supabase free tier exhausted at ~500MB DB or 50k API requests → Supabase Pro $25/month. Expected at ~1,000-2,000 active users.

**Future cost scaling (Phase 3 — 10,000 MAU)**:
- Supabase Pro ($25/month)
- Lambda compute: ~$2/month (still very low due to arm64 Graviton2 pricing)
- S3: ~$5/month (estimated 200GB at scale)
- CloudFront: within free tier (1TB)
- Total estimated: ~$35/month at 10,000 MAU

---

## 9. DORA Metrics Baseline

| Metric | MVP Baseline | Target (Phase 3) |
|--------|-------------|------------------|
| Deployment frequency | On-demand (manual `sam deploy`) | Weekly (automated on main push) |
| Lead time for changes | < 1 day (commit → prod) | < 4 hours |
| Change failure rate | Unmeasured (tracking starts now) | < 15% |
| Time to restore | < 30 min (redeploy previous commit) | < 15 min |

**DORA classification**: Medium performer at MVP stage. Path to High performer by Phase 3 via automated deployment from CI pipeline.

---

## 10. Rollback Procedure

Rollback is designed before rollout (principle 7).

### Rollback triggers
- Error rate > 5% on any Lambda function for > 5 minutes (CloudWatch Alarm)
- P99 latency > 3,000ms for outfit generation for > 5 minutes
- Manual decision by CTO

### Rollback steps
1. Identify previous working commit: `git log --oneline -10`
2. Checkout previous commit: `git checkout <sha>`
3. Redeploy: `pnpm --filter @pocketwardrobe/functions deploy:prod`
4. Verify: `curl <ApiEndpoint>/health` returns 200
5. Monitor: CloudWatch dashboard for 15 minutes post-rollback
6. Communicate: update incident channel

**Estimated rollback time**: 5-10 minutes (dominated by SAM deployment).

**Database migrations**: Migrations are additive-only in MVP (no column removals, no destructive changes). No database rollback required for code rollbacks. If a migration must be reversed, apply a corrective forward migration (never edit applied migration files).

---

## 11. Security Posture

| Concern | Control |
|---------|---------|
| Secrets in code | All secrets in SSM Parameter Store (SecureString); `.env.local` in `.gitignore` |
| JWT validation | API Gateway JWT authorizer validates RS256 tokens against Supabase JWKS; no Lambda code involved |
| S3 public access | Blocked at bucket level; CloudFront OAC is only read path |
| EXIF stripping | In Lambda before S3 write (Sharp library) — GDPR compliance |
| GDPR region | All resources in eu-west-1 (Frankfurt); enforced by SAM deployment region |
| Dependency scanning | Dependabot enabled (add `.github/dependabot.yml`) — recommended next step |
| Secrets detection | Add `gitleaks` pre-commit hook — recommended next step |

---

## 12. Infrastructure Files Created

| File | Purpose |
|------|---------|
| `README.md` | Full developer setup and deployment guide |
| `packages/functions/src/local-server.ts` | Express wrapper for local Lambda dev |
| `.env.example` | Environment variable reference template |
| `packages/functions/package.json` | Added `dev`, `deploy`, `deploy:prod` scripts |
| `template.yaml` | AWS SAM infrastructure definition |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline |
| `docs/feature/app-deployment-setup/deliver/platform-architecture.md` | This document |
