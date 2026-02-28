# ADR-005: AI Integration Strategy — Nano Banana API + SQS Async Pattern

**Status**: Accepted
**Date**: 2026-02-28
**Deciders**: CTO, Morgan (Solution Architect)

---

## Context

PocketWardrobe's core differentiator is AI-powered garment digitization: a single photo produces background-removed image + category + color + season + occasion metadata. This is the highest-risk technical assumption in the product (TT-01 spike).

Key constraints:
- Latency target: < 10s P95 for full processing (requirement from US-02 AC)
- AI correction rate target: < 15% (critical business metric)
- GDPR: photos must remain in EU; any AI provider must either process in EU or receive only EXIF-stripped images
- Budget: must be cost-viable at 4,445 MAU × 50 items/user average = 222,250 photos
- Reliability: Nano Banana API outage must not block users from adding items

The Nano Banana API is explicitly specified in the business plan. TT-01 spike (5 days, CTO) will validate latency, quality, and cost before Walking Skeleton delivery.

---

## Decision

**Primary AI processor**: Nano Banana API
**Integration pattern**: Asynchronous via SQS queue (not synchronous in request path)
**Adapter**: `NanaBananaAdapter` implementing `AIProcessorPort` (outbound port)
**Resilience**: Circuit breaker + exponential backoff retry

**Processing flow**:
```
1. Mobile uploads photo to S3 (pre-signed URL — direct to storage, not through Lambda)
2. S3 event notification → SQS message enqueued
3. Lambda consumer picks up SQS message
4. Lambda: EXIF strip → face detection → Sharp thumbnail → Nano Banana submission
5. Nano Banana returns: background-removed URL + classification JSON
6. Lambda writes item record (status: pending_review) → Supabase Realtime event → Mobile
7. User reviews AI metadata on device → confirms or corrects → item becomes "active"
```

**Fallback behavior**:
- Nano Banana timeout (>15s) or 5xx: item enters `pending_review` state with no AI metadata
- User can manually enter metadata — item still joins wardrobe
- Circuit breaker opens after 5 failures in 60s; half-open probe every 30s
- Correction is flagged `manual_classification = true`; logged to `ai_quality_log`

**Confidence score branching**:
- Confidence ≥ 0.85: metadata pre-filled, "Add to wardrobe" CTA prominent
- Confidence 0.6-0.85: metadata pre-filled, fields highlighted for review
- Confidence < 0.6: manual picker shown for uncertain fields
(Thresholds validated during TT-01 spike and may be tuned in alpha)

---

## Consequences

### Positive
- Async pattern prevents Lambda timeout on AI calls — user UI is not blocked waiting for AI
- SQS queue decouples upload volume from AI processing capacity — burst uploads handled gracefully
- Circuit breaker isolates Nano Banana failures — app remains functional (manual entry fallback)
- `AIProcessorPort` interface: Nano Banana adapter can be replaced with another provider without domain changes
- EXIF stripping before AI submission: GDPR-compliant (no location metadata reaches external API)

### Negative
- Async pattern adds complexity vs synchronous call: SQS, Lambda consumer, Supabase Realtime event chain
- Mobile must handle "processing" state (item in progress — not yet in wardrobe grid)
- TT-01 spike is a prerequisite: if Nano Banana P95 > 10s or quality is unacceptable, the AC must be revised or a secondary provider added before MVP

### TT-01 spike deliverables (gates Walking Skeleton)
- Documented P50/P95 latency from 50 test photos (EU fashion garments)
- Documented cost-per-image at 200 beta users, 1000 MAU, 4445 MAU
- Sample background-removed images rated by team (acceptable / needs correction)
- Decision: Nano Banana for background removal AND classification, or classification from a separate provider?
- Confidence score format and availability confirmed

---

## Alternatives Considered

### Alternative 1: Synchronous Nano Banana call in Lambda (no SQS)
- **Strengths**: Simpler architecture (no queue); item appears in wardrobe faster if AI is fast
- **Weaknesses**: Lambda timeout risk if Nano Banana P95 exceeds 15s (default Lambda timeout for API Gateway integration); mobile client must wait synchronously; any AI slowdown directly degrades user experience; retry logic is harder without queue
- **Rejected**: SQS async is the correct pattern for potentially slow external AI calls. The 10s UX target can still be met with a Supabase Realtime push when AI completes. Synchronous call creates fragility.

### Alternative 2: AWS Rekognition + Custom Classification (replace Nano Banana)
- **Strengths**: Native AWS service (no external vendor); custom label training; EU region support
- **Weaknesses**: Rekognition does not provide background removal; a separate background removal service would be needed; custom model training requires labeled dataset (not available at MVP); cost at scale comparable to Nano Banana
- **Rejected as primary**: Nano Banana is specified by the product team as the chosen AI provider. Rekognition is used for face detection only (pre-upload check). If TT-01 spike reveals Nano Banana classification quality is insufficient, Rekognition custom labels can be added as a secondary classification layer.

### Alternative 3: On-device ML (Core ML / TensorFlow Lite)
- **Strengths**: No API latency; no per-image cost; works offline
- **Weaknesses**: Model quality for garment classification + background removal is far below cloud APIs without extensive training data; model size increases app binary; no background removal capability at acceptable quality on-device
- **Rejected**: Insufficient quality for the core trust metric (< 15% correction rate). On-device preprocessing (lighting quality check) is used for UX only.
