# ADR-003: Backend Runtime and Serverless Platform — Node.js 22 + AWS Lambda

**Status**: Accepted
**Date**: 2026-02-28
**Deciders**: CTO, Morgan (Solution Architect)

---

## Context

PocketWardrobe requires a serverless backend to:
- Handle API requests from the mobile app (wardrobe CRUD, outfit generation, wear event recording)
- Process AI digitization jobs (submit photo to Nano Banana, process result, store image)
- Schedule morning outfit notifications (daily scheduled job)
- Scale automatically to 4,445 MAU without architectural change

The team is 4 people. CTO owns backend. Primary language is TypeScript (see ADR-006). Backend must run in the AWS ecosystem for co-location with S3 image storage and SQS queue.

Key constraints:
- Budget: startup, serverless pay-per-use preferred over reserved instances
- Timeline: Month 2-3 MVP delivery
- Scalability: must reach 4,445 MAU without re-architecture

---

## Decision

**Node.js 22 LTS** (`nodejs22.x` runtime) on **AWS Lambda** with **AWS API Gateway** (REST API type).

Supporting services in the serverless stack:
- **AWS SQS**: decouples photo upload from AI processing (avoids Lambda timeout on Nano Banana calls)
- **AWS EventBridge**: scheduled rule for morning outfit generation (07:00 local time)
- **AWS CloudWatch**: Lambda metrics, error alerting
- Deployment: **esbuild** bundling per function (< 5MB bundle target)
- IaC: **SST v3** (MIT, Ion framework) — TypeScript-native Lambda and API Gateway definition; first-class monorepo support; `sst dev` local Lambda invocation; preferred over AWS SAM (YAML-based, less ergonomic for TypeScript teams)

---

## Consequences

### Positive
- TypeScript monorepo: Lambda functions share `packages/domain` — same language as mobile, no bridge required
- Pay-per-invocation billing: at MVP scale (200 beta users), Lambda cost is effectively zero
- AWS Lambda scales automatically — no cluster management; 4,445 MAU target is within default Lambda concurrency limits
- SQS queue absorbs AI processing spikes — Lambda scales consumers independently from API handlers
- Node.js 22 LTS: supported until April 2027; sufficient for the roadmap horizon
- Native AWS integration: S3 SDK, Rekognition, EventBridge, SQS — no additional orchestration layer

### Negative
- Cold start: Lambda cold starts add 200-800ms on first invocation after idle. Mitigation: provisioned concurrency on 2 instances for the digitization Lambda (critical path)
- Lambda execution limit: 15 minutes max. AI processing via Nano Banana targeted at < 10s; well within limit
- Vendor lock-in: AWS-specific services (SQS, EventBridge, Rekognition). Mitigation: all AWS calls are behind outbound port adapters — switching providers requires only new adapter implementations
- Connection pooling: Lambda + PostgreSQL requires PgBouncer (provided by Supabase) to avoid connection exhaustion

---

## Alternatives Considered

### Alternative 1: Bun on Lambda (custom runtime)
- **Strengths**: Native TypeScript execution, 3-5x faster startup than Node.js for some workloads
- **Weaknesses**: Custom Lambda runtime required (no `bun.x` managed runtime); experimental; smaller community than Node.js; limited Lambda-specific documentation; startup performance advantage is irrelevant at this traffic scale
- **Rejected**: Increased operational risk for a team of 4 on a Month 2-3 deadline. Node.js 22 LTS is the lowest-risk choice with full AWS Lambda support.

### Alternative 2: Deno on Lambda (custom runtime)
- **Strengths**: Native TypeScript, security by default, ES modules
- **Weaknesses**: Same custom runtime requirement as Bun; Deno's AWS SDK compatibility requires shims; smaller community than Node.js
- **Rejected**: Same reasoning as Bun. Additional risk from AWS SDK compatibility layer.

### Alternative 3: Container-based deployment (ECS Fargate)
- **Strengths**: No cold start; more control over execution environment; supports long-running processes
- **Weaknesses**: Always-on billing even at idle; more DevOps complexity; over-engineered for a team of 4 at 200 beta users; does not scale automatically to arbitrary load without additional configuration
- **Rejected**: Serverless is explicitly specified in the business plan and appropriate for pay-per-use MVP economics. Containers can be adopted in Phase 3 if specific workloads require it.
