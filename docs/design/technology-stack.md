# PocketWardrobe — Technology Stack

**Version**: 1.0
**Date**: 2026-02-28
**Paradigm**: OOP TypeScript (see ADR-006)

All technology choices prioritize OSS with MIT or Apache 2.0 licenses. Proprietary services (AWS, Supabase hosted) are infrastructure-as-a-service with open-source compatible self-hosting alternatives.

---

## Stack Summary

| Layer | Technology | License | Rationale |
|-------|-----------|---------|-----------|
| Mobile | React Native 0.74 + Expo SDK 51 | MIT | See ADR-002 |
| Backend runtime | Node.js 22 LTS | MIT | See ADR-003 |
| Serverless platform | AWS Lambda + API Gateway | Proprietary (no viable OSS alternative at this scale) | See ADR-003 |
| Database | PostgreSQL 16 via Supabase | PostgreSQL: PostgreSQL License; Supabase: Apache 2.0 | See ADR-004 |
| Image storage | AWS S3 + CloudFront | Proprietary (de facto standard; no license risk) | Paired with ADR-003 |
| Auth | Supabase Auth (JWT) | Apache 2.0 | See ADR-004 |
| AI integration | Nano Banana API | Proprietary (explicitly required by brief) | See ADR-005 |
| Weather API | Open-Meteo | AGPLv3 (free for non-commercial; open data) | Documented below |
| Push notifications | Expo Notifications | MIT | OSS abstraction over APNs/FCM |
| ORM / query | Supabase JS client + postgres.js | MIT | Type-safe, no ORM overhead |
| Image processing | Sharp (Lambda layer) | Apache 2.0 | EXIF strip + thumbnail generation |
| Mobile list rendering | FlashList (Shopify) | MIT | 200-item wardrobe grid performance |
| Mobile state | React Query (TanStack) + MMKV | MIT | Offline persistence + server state |
| Mobile navigation | Expo Router | MIT | File-based routing, native stack |
| Testing | Vitest + React Native Testing Library | MIT | Unit + integration coverage |
| CI/CD | GitHub Actions | Free tier (OSS) | Monorepo pipeline |
| Monitoring | AWS CloudWatch + OpenTelemetry | Apache 2.0 | Lambda metrics + distributed traces |

---

## 1. Mobile: React Native + Expo

**Framework**: React Native 0.74 (Meta, MIT)
**Toolchain**: Expo SDK 51 with EAS Build

**Why React Native over Flutter**:

Flutter (Google, BSD-3) is a strong alternative. Decision factors:

| Factor | React Native | Flutter |
|--------|-------------|---------|
| Language | TypeScript (team likely knows JS/TS) | Dart (new language to learn) |
| Ecosystem | NPM ecosystem, React Query, Expo | Pub.dev (smaller) |
| AI/API integration libs | Extensive | Adequate |
| Team of 4 with CTO context | TS monorepo (backend + mobile share types) | Separate Dart codebase |
| Community size | Larger (React devs) | Growing fast |
| Camera/native modules | Expo Camera, mature | Good but fewer plug-ins |

Verdict: React Native enables full TypeScript monorepo — domain types shared between mobile and backend Lambda. Team cognitive load reduced. See ADR-002.

**Key mobile libraries**:
- `expo-camera` — camera capture (MIT)
- `expo-image-picker` — gallery import (MIT)
- `expo-notifications` — push notification receipt (MIT)
- `expo-network` — offline detection for upload queue (MIT)
- `@shopify/flash-list` — high-performance wardrobe grid (MIT)
- `@tanstack/react-query` — server state + offline persistence (MIT)
- `react-native-mmkv` — fast device storage for offline queue (MIT)
- `expo-router` — file-based navigation (MIT)

---

## 2. Backend: Node.js 22 LTS on AWS Lambda

**Runtime**: Node.js 22 LTS (EOL: April 2027)
**Platform**: AWS Lambda + API Gateway (REST)

**Why Node.js over Bun/Deno**:

| Factor | Node.js 22 | Bun | Deno |
|--------|-----------|-----|------|
| Lambda support | Native first-class | Experimental custom runtime | Experimental custom runtime |
| TypeScript | ts-node / esbuild | Native | Native |
| Ecosystem maturity | 15 years, massive NPM | 2 years, growing | 4 years, good |
| Team risk | Lowest | Medium | Medium |
| AWS SDK v3 | Full support | Full support | Full support |

Verdict: Node.js 22 LTS on Lambda is the lowest-risk path for a 4-person team with a Month 2-3 delivery target. Bun's performance advantage is not relevant at this traffic scale. See ADR-003.

**Lambda configuration**:
- Runtime: `nodejs22.x`
- Memory: 512MB for AI processing functions; 256MB for CRUD functions
- Timeout: 30s for AI path; 10s for standard API functions
- Provisioned concurrency: 2 warm instances for digitization path (avoids cold start on first item capture)
- Deployment: esbuild bundle per function (< 5MB)

**Monorepo structure**:
```
packages/
  domain/          # Pure TS domain core (no Node/React deps)
  mobile/          # React Native app
  functions/       # Lambda handlers (thin adapters over domain)
  shared-types/    # TypeScript interfaces shared mobile + backend
```

---

## 3. Database: PostgreSQL 16 via Supabase

**Database**: PostgreSQL 16 (PostgreSQL License — permissive, OSS)
**Hosting**: Supabase (Apache 2.0 platform; self-hostable)
**Connection pooling**: PgBouncer (built into Supabase, MIT)

**Why PostgreSQL over alternatives**:

| Factor | PostgreSQL | DynamoDB | MongoDB |
|--------|-----------|---------|---------|
| Relational queries | Excellent | No (single-table design required) | No |
| JSONB (flexible metadata) | Native, indexed | N/A | Native |
| Outfit rotation query | Window functions, CTEs | Complex | Aggregation pipeline |
| GDPR deletion | CASCADE DELETE | Manual cleanup | Manual cleanup |
| Serverless connection | PgBouncer required | No connection limit | Atlas serverless |
| OSS | Yes | No | SSPL (non-OSS) |
| Supabase bonus | Auth, Row Level Security, Realtime | N/A | N/A |

Verdict: PostgreSQL wins on query complexity (outfit rotation needs window functions), GDPR cascade delete, and Supabase's bundled auth + RLS. See ADR-004.

**Supabase specifics**:
- Row Level Security (RLS) enforces user data isolation at DB layer
- Supabase Auth: JWT issuer (RS256); mobile client receives access + refresh tokens
- Supabase Realtime: used for upload progress events (item_count update to mobile without polling)
- EU region: `eu-west-1` (Frankfurt)

---

## 4. Image Storage: AWS S3 + CloudFront

**Original storage**: S3 Standard-IA (infrequent access, EU region `eu-west-1`)
**Thumbnail delivery**: S3 + CloudFront CDN (immutable, long TTL)
**Processing**: Sharp (Apache 2.0) in Lambda layer for:
  - EXIF metadata stripping (GDPR compliance)
  - Thumbnail generation (max 200KB, WebP format)
  - Face detection pre-check (AWS Rekognition or on-device via Vision API)

**Upload flow**:
1. Mobile requests pre-signed S3 URL from API
2. Mobile uploads directly to S3 (bypasses Lambda for large payloads)
3. S3 event triggers SQS message
4. Lambda consumer processes: EXIF strip → face check → Nano Banana submission → thumbnail generation → DB record creation

**Cost note**: At 4,445 MAU × 50 items avg = 222,250 photos. At ~100KB thumbnail avg, CDN storage ~22GB. CloudFront cost negligible at this scale. CTO to produce cost projection before Phase 3 (as documented in requirements).

**Face detection cost**: AWS Rekognition DetectFaces at $0.001/image × 222,250 photos = ~$222 one-time digitization cost. Acceptable at scale. Alternative: on-device face detection via Apple Vision (iOS) / ML Kit (Android) — free, reduces PII exposure to external APIs. Evaluate during TT-01 spike; prefer on-device if quality is sufficient.

---

## 5. AI Integration: Nano Banana API

**Provider**: Nano Banana API (proprietary — explicitly required by product brief)
**Integration pattern**: Async via SQS (not synchronous HTTP in critical path)
**Adapter**: `NanaBananaAdapter` implements `AIProcessorPort`

**Capabilities used**:
- Background removal (garment isolation)
- Category classification (category + subcategory)
- Color detection (primary color + descriptive label)
- Fabric recognition (where API supports)
- Confidence scores (used for auto-accept vs manual-review branching)

**Fallback strategy**:
- Circuit breaker on adapter (5 failures in 60s → open circuit)
- Item enters `pending_ai_review` state; user is notified and can manually enter metadata
- Manual entries flagged `manual_classification = true`

**TT-01 spike validates**:
- P50/P95 latency targets
- Cost per image at 3 scale levels
- Confidence score availability
- Background removal quality for EU fashion items

---

## 6. Weather API: Open-Meteo

**Provider**: Open-Meteo (AGPLv3 applies to Open-Meteo's server software, NOT to API consumers. PocketWardrobe is an HTTP API consumer — AGPLv3 copyleft does not extend to callers. Free for commercial use via public API; Open-Meteo requests a sponsorship arrangement above 10,000 requests/day at scale.)
**URL**: `https://api.open-meteo.com/v1/forecast`
**Endpoint used**: Daily forecast by latitude/longitude
**Cost**: Free at MVP scale (< 10,000 req/day). Sponsorship or commercial agreement before Phase 3 launch if volume exceeds threshold.

**Caching**:
- Cache key: `{city_slug}:{date_YYYY-MM-DD}`
- Storage: `weather_cache` table in PostgreSQL
- TTL: Expires at midnight local time of the user's city
- Miss: Lambda fetches from Open-Meteo, stores result
- Hit: Returns cached value (typical case for repeated outfit generations in same day)

**Fallback**: `WeatherServicePort` returns `null` on timeout or 5xx. `GenerateOutfitSuggestion` use case proceeds without weather context. UI displays "Weather info unavailable today."

**Alternative considered**: OpenWeatherMap (proprietary, paid above 60 calls/min). Rejected: Open-Meteo is free, OSS-backed, sufficient accuracy for outfit context.

---

## 7. Authentication: Supabase Auth (JWT)

**Protocol**: JWT RS256 (Supabase as issuer)
**Session management**: Access token (1h TTL) + refresh token (7d TTL, rotated)
**Validation**: API Gateway Lambda authorizer validates JWT on every request
**Anonymous profiles**: Style calibration persists anonymously until account creation (Supabase supports anon → authenticated user migration)
**GDPR deletion**: Supabase Auth user deletion cascades through RLS to all user data

**Why JWT over sessions**:
- Serverless: Lambda is stateless; session stores require external state (Redis, etc.)
- JWT enables API Gateway validation without DB hit on every request
- Supabase Auth provides JWT issuance + refresh rotation out of the box
- See ADR-004

---

## 8. Observability Stack

| Concern | Tool | License |
|---------|------|---------|
| Lambda metrics + logs | AWS CloudWatch | Proprietary (bundled) |
| Distributed tracing | OpenTelemetry SDK | Apache 2.0 |
| AI correction rate dashboard | Custom CloudWatch dashboard (CTO-owned) | — |
| Outfit acceptance rate | CloudWatch custom metrics | — |
| Error alerting | CloudWatch Alarms + SNS | Proprietary (bundled) |

**Key operational metrics**:
- `ai_correction_rate` per category (alert if > 25%)
- `outfit_acceptance_rate` (target > 40% in first week)
- `digitization_completion_rate` (5 items in session 1; target > 80%)
- `d7_retention` (target > 35%)
- Lambda P95 duration per function
- SQS queue depth (AI processing backlog)
