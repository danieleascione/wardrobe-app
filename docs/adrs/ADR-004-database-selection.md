# ADR-004: Database Selection — PostgreSQL via Supabase

**Status**: Accepted
**Date**: 2026-02-28
**Deciders**: CTO, Morgan (Solution Architect)

---

## Context

PocketWardrobe requires a database for:
- Wardrobe items with structured fields (category, occasion, season) + semi-structured metadata (color, fabric)
- Outfit suggestions with item ID arrays and JSONB weather context
- Wear events with item ID arrays (final item set after swaps)
- Style profiles with array fields (occasion_priorities)
- Outfit rotation constraint query (7-day window per user — needs window function or indexed date range)
- Unworn items query (wear_events joined to items, filtered by date range and item age)
- GDPR cascade delete on user account deletion

Serverless context: Lambda functions have short lifetimes. Connection pooling is required to prevent PostgreSQL connection exhaustion under concurrent Lambda invocations.

Team: 4 people. CTO owns backend. Minimizing operational overhead is a priority.

---

## Decision

**PostgreSQL 16** hosted on **Supabase** (EU region `eu-west-1`).

Rationale:
- Relational model with PostgreSQL arrays and JSONB handles all data shapes without requiring a separate document store
- Outfit rotation query requires window functions and indexed date range — PostgreSQL excels here
- GDPR cascade delete: FK cascades handle user data deletion automatically
- Supabase bundles: Auth (JWT issuance), Row Level Security, PgBouncer (connection pooling), Realtime (WebSocket for item_count updates), Studio (schema management)
- Supabase is Apache 2.0 (self-hostable); PostgreSQL is PostgreSQL License (permissive)
- Schema migration via Supabase CLI (versioned, committed to git)

**Auth**: Supabase Auth (RS256 JWT) handles anonymous → authenticated user migration (required for anonymous calibration before account creation). Access tokens: 1h TTL. Refresh tokens: 7d TTL, rotated on use.

---

## Consequences

### Positive
- Single database vendor provides Auth + DB + connection pooling + realtime — reduces integration surface for a small team
- Row Level Security at database layer: user isolation enforced even if application layer has a bug
- PostgreSQL arrays: `item_ids UUID[]`, `occasions TEXT[]`, `seasons TEXT[]` — no join tables for these fields
- JSONB: `weather_context JSONB` on outfit_suggestions allows flexible weather data without schema migration
- Realtime: SQS → Lambda → Supabase Realtime → Mobile for item_count update (avoids polling)
- Supabase EU region: GDPR data residency requirement met out of the box
- PgBouncer built-in: Lambda cold starts don't exhaust PostgreSQL connection limit

### Negative
- Supabase hosted: dependency on Supabase's infrastructure uptime (they use AWS under the hood; SLA matches Supabase Pro plan)
- Connection string management: Supabase client in Lambda requires environment variables for DB URL and anon/service keys — managed via AWS Secrets Manager
- Supabase free tier limits (500MB DB, 1GB storage) — must upgrade to Pro before beta launch

### Migration path
- If Supabase becomes a concern (cost, compliance, vendor lock): self-host Supabase on EC2, or migrate to bare PostgreSQL RDS with a separate auth solution. All application code uses the port/adapter pattern — only `SupabaseXxxRepository` adapters need rewriting.

---

## Alternatives Considered

### Alternative 1: DynamoDB (AWS native)
- **Strengths**: Native Lambda integration, no connection pooling needed, auto-scales, pay-per-request billing
- **Weaknesses**: Single-table design required for relational patterns; outfit rotation query (7-day window per user with item deduplication) becomes very complex; no GDPR cascade delete (manual cleanup required); no JSONB (must use Maps, less queryable); no SQL window functions for wardrobe analytics
- **Rejected**: Outfit rotation query complexity and GDPR deletion handling are materially better in PostgreSQL. DynamoDB's strengths (no connection management, native Lambda) are solved by PgBouncer in Supabase.

### Alternative 2: MongoDB Atlas (document store)
- **Strengths**: Flexible document schema for item metadata; Atlas Serverless (pay-per-use)
- **Weaknesses**: SSPL license (not OSS for SaaS use); relational queries (rotation, worn counts) require aggregation pipelines vs SQL window functions; GDPR cascade delete requires manual implementation; no built-in auth or connection pooling comparable to Supabase
- **Rejected**: SSPL license is incompatible with OSS-first principle. Relational query patterns in the outfit engine favor PostgreSQL. No bundled auth.

### Alternative 3: PlanetScale (MySQL-based, serverless)
- **Strengths**: Serverless MySQL, no connection limits, branching for schema migrations
- **Weaknesses**: MySQL arrays require JSON column (less ergonomic than PostgreSQL `TEXT[]`); no Row Level Security; foreign key constraints disabled by default (PlanetScale Vitess limitation) — breaks GDPR cascade delete; no bundled auth
- **Rejected**: Foreign key constraint limitation directly blocks the GDPR cascade delete requirement. PostgreSQL arrays are cleaner for `item_ids`, `occasions`, `seasons` fields.
