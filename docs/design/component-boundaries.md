# PocketWardrobe — Component Boundaries

**Version**: 1.0
**Date**: 2026-02-28
**Architecture**: Hexagonal (Ports and Adapters)
**Paradigm**: OOP TypeScript

---

## 1. Bounded Contexts

PocketWardrobe has one primary bounded context for the MVP: **Wardrobe Management**. Deferred features (Social Closet, Resale) are future bounded contexts connected via anti-corruption layers.

```
┌─────────────────────── Wardrobe Management (MVP) ───────────────────────┐
│                                                                          │
│  StyleProfile   Item   Wardrobe   Outfit   WearEvent   WardrobeStats    │
│                                                                          │
│  [Digitization] [OutfitSuggestion] [WearTracking] [StyleCalibration]   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ↓ (future AC layer)  ↓ (future AC layer)  ↓ (future AC layer)
┌──────────────┐    ┌───────────────────┐    ┌──────────────────────┐
│ Resale       │    │ Gap Detection /   │    │ Social Closet        │
│ (Phase 3)    │    │ Smart Shopping    │    │ (Phase 3)            │
└──────────────┘    └───────────────────┘    └──────────────────────┘
```

---

## 2. Domain Core — Entities and Value Objects

### Entities (identity-based)

| Entity | Identity | Responsibility |
|--------|---------|---------------|
| `Item` | `item_id` (UUID) | Single garment. Holds metadata, photo URLs, wear tracking. Aggregate root for item lifecycle. |
| `Wardrobe` | `wardrobe_id` (UUID, 1:1 with user) | Collection of Items. Enforces item_count, 5-item unlock gate, unworn eligibility. |
| `Outfit` | `outfit_id` (UUID) | Combination of 3+ Items for a specific occasion and date. Immutable after suggestion creation. |
| `WearEvent` | `wear_event_id` (UUID) | Record of user accepting an outfit on a specific date. Final item set may differ from Outfit (swaps). |
| `StyleProfile` | `style_profile_id` (UUID, 1:1 with user) | User style preferences. Controls suggestion engine defaults. |

### Value Objects (equality-based, immutable)

| Value Object | Fields | Used By |
|-------------|--------|---------|
| `Color` | `primary: string`, `label: string`, `hex?: string` | Item |
| `Category` | `category: string`, `subcategory: string` | Item |
| `Size` | `label: string`, `system: "EU" \| "UK" \| "US"` | Item (optional) |
| `Season` | `values: ("spring" \| "summer" \| "autumn" \| "winter")[]` | Item |
| `Occasion` | `values: ("work" \| "casual" \| "sport" \| "events")[]` | Item, StyleProfile, Outfit |
| `WeatherContext` | `city: string`, `date: Date`, `tempCelsius: number`, `condition: string` | Outfit generation input |
| `AIClassification` | `category: Category`, `color: Color`, `season: Season`, `occasions: Occasion`, `confidence: number` | Digitization use case |
| `WardrobeStats` | `totalItems: number`, `unwornThisMonth: number`, `eligibleForStats: boolean` | Derived, not persisted |

---

## 3. Inbound Ports (Use Cases)

Inbound ports define what the domain exposes to the outside world. All are interfaces; implementations live in use case classes.

### `StyleCalibrationPort`

```
Commands:
  CompleteCalibration(userId, archetype, occasions, palette) → StyleProfile
  SkipCalibration(userId) → StyleProfile (with defaults)
  UpdateStyleProfile(userId, patch) → StyleProfile
```

**Business rules enforced**:
- BR-09: Default values applied on skip (classic, work/casual, neutral)
- Calibration never blocks app entry

---

### `ItemDigitizationPort`

```
Commands:
  InitiateDigitization(userId, photoUploadKey) → DigitizationJob
  ConfirmItem(userId, jobId, metadata) → Item
  CorrectMetadata(userId, itemId, corrections) → Item
  DeleteItem(userId, itemId) → void
```

**Business rules enforced**:
- BR-06: `photo_url` must reference background-removed version
- BR-05-adjacent: GDPR consent must be logged before any upload
- item_count increments only on confirm (not on initiate)
- Correction flagged as `manual_classification = true`

---

### `OutfitSuggestionPort`

```
Queries:
  GetDailyOutfit(userId, date, occasionOverride?) → OutfitSuggestion
  GenerateOutfitForItem(userId, focusItemId) → OutfitSuggestion

Commands:
  AcceptOutfit(userId, outfitId, finalItemIds) → WearEvent
  SwapItem(userId, outfitId, removeItemId, addItemId) → OutfitPreview
```

**Business rules enforced**:
- BR-01: No suggestion until wardrobe.item_count >= 5
- BR-03: Outfit must contain >= 3 items
- BR-04: No exact combination repeat within 7-day window (>= 15 items) or 3-day window (< 15 items)
- BR-05: WearEvent created only on explicit accept, not on view
- BR-07: Weather cache invalidated at midnight local time
- BR-08: Outfits referencing deleted items are invalidated

---

### `WardrobeQueryPort`

```
Queries:
  GetWardrobeGrid(userId, filters?) → Item[]
  GetWardrobeStats(userId) → WardrobeStats
  GetUnwornItems(userId) → Item[]
  GetItemById(userId, itemId) → Item
  GetAlternativesForCategory(userId, category) → Item[]
```

**Business rules enforced**:
- Unworn eligibility gate: >= 15 items AND >= 7 days of use
- "Unworn" = worn_count = 0 in past 30 days AND item added > 14 days ago

---

## 4. Outbound Ports (Required Services)

Outbound ports define what the domain needs from the outside. All are interfaces; adapters provide implementations.

### Repository Ports (data persistence)

| Port | Responsibility | Adapter |
|------|---------------|---------|
| `ItemRepositoryPort` | CRUD for Item aggregate | `SupabaseItemRepository` |
| `OutfitRepositoryPort` | Persist outfit_suggestions; query outfit_history | `SupabaseOutfitRepository` |
| `WearEventRepositoryPort` | Persist wear_events; query worn counts | `SupabaseWearEventRepository` |
| `StyleProfileRepositoryPort` | Read and write StyleProfile | `SupabaseStyleProfileRepository` |
| `WeatherCacheRepositoryPort` | Cache weather context by city+date | `SupabaseWeatherCacheRepository` |

### Service Ports (external integrations)

| Port | Responsibility | Adapter |
|------|---------------|---------|
| `AIProcessorPort` | Submit photo → return AIClassification + background-removed URL | `NanaBananaAdapter` |
| `WeatherServicePort` | Fetch daily weather by city → return WeatherContext or null | `OpenMeteoAdapter` |
| `ImageStorePort` | EXIF strip, thumbnail gen, write to S3 → return CDN URLs | `S3ImageStoreAdapter` |
| `FaceDetectionPort` | Check photo for human faces → return boolean | `RekognitionFaceDetectionAdapter` |
| `PushNotificationPort` | Schedule morning outfit notification | `ExpoPushAdapter` |
| `ConsentLogPort` | Log photo consent with timestamp and version | `SupabaseConsentLogAdapter` |

---

## 5. Adapter Inventory

### Primary (Driving) Adapters — inbound

| Adapter | Technology | Driven Port |
|---------|-----------|-------------|
| `StyleCalibrationHandler` | Lambda HTTP handler | `StyleCalibrationPort` |
| `ItemDigitizationHandler` | Lambda HTTP handler + SQS consumer | `ItemDigitizationPort` |
| `OutfitSuggestionHandler` | Lambda HTTP handler | `OutfitSuggestionPort` |
| `WardrobeQueryHandler` | Lambda HTTP handler | `WardrobeQueryPort` |
| `ScheduledOutfitGenerator` | EventBridge scheduled Lambda | `OutfitSuggestionPort` |
| `MobileAppClient` | React Native (Expo) | All inbound ports via API |

### Secondary (Driven) Adapters — outbound

| Adapter | Technology | Implements Port |
|---------|-----------|----------------|
| `SupabaseItemRepository` | Supabase JS client / postgres.js | `ItemRepositoryPort` |
| `SupabaseOutfitRepository` | Supabase JS client | `OutfitRepositoryPort` |
| `SupabaseWearEventRepository` | Supabase JS client | `WearEventRepositoryPort` |
| `SupabaseStyleProfileRepository` | Supabase JS client | `StyleProfileRepositoryPort` |
| `SupabaseWeatherCacheRepository` | Supabase JS client | `WeatherCacheRepositoryPort` |
| `NanaBananaAdapter` | Axios + circuit breaker | `AIProcessorPort` |
| `OpenMeteoAdapter` | Axios | `WeatherServicePort` |
| `S3ImageStoreAdapter` | AWS SDK v3 + Sharp | `ImageStorePort` |
| `RekognitionFaceDetectionAdapter` | AWS SDK v3 Rekognition | `FaceDetectionPort` |
| `ExpoPushAdapter` | Expo Server SDK | `PushNotificationPort` |
| `SupabaseConsentLogAdapter` | Supabase JS client | `ConsentLogPort` |

---

## 6. Dependency Rules

```
┌──────────────────────────────────────────────────────┐
│ Rule 1: Domain core imports NOTHING external         │
│ — No AWS SDK, no Supabase client, no Axios           │
│ — No React, no React Native                          │
│ — Only TypeScript built-ins and domain types         │
├──────────────────────────────────────────────────────┤
│ Rule 2: Use cases import ONLY outbound port          │
│ interfaces (not adapter implementations)             │
│ — Dependency inversion via constructor injection     │
├──────────────────────────────────────────────────────┤
│ Rule 3: Adapters import their port interface AND     │
│ the external library they adapt                      │
│ — NanaBananaAdapter imports AIProcessorPort + Axios  │
├──────────────────────────────────────────────────────┤
│ Rule 4: Mobile app imports only shared-types and     │
│ never imports domain packages directly               │
│ — Mobile communicates via HTTP API only              │
├──────────────────────────────────────────────────────┤
│ Rule 5: No adapter imports another adapter           │
│ — Adapters are independent; coordination in use case │
└──────────────────────────────────────────────────────┘
```

**Package dependency graph** (arrows = "depends on"):
```
mobile → shared-types
functions → domain, shared-types
functions/adapters → domain/ports, [external libs]
domain/use-cases → domain/entities, domain/ports
domain/entities → (nothing)
```

---

## 7. Seam Points for Deferred Features

Each deferred feature has a clearly identified seam — the point where it will plug into the existing architecture without modifying the domain core.

### Virtual Try-On (Phase 3)

**Seam**: `ItemDigitizationPort.ConfirmItem` + new `TryOnPort`

What changes:
- `DigitizeItem` use case gains optional call to `TryOnRenderingPort` after item confirmation
- New outbound port: `TryOnRenderingPort` with `renderTryOn(userId, itemId, bodyProfileId) → TryOnResult`
- New adapter: `NanaBananaTryOnAdapter` (Nano Banana photorealistic render endpoint)
- New entity: `BodyProfile` (separate table, explicit consent, independent deletion)
- Mobile: new `TryOnScreen` component; new API route
- Business rule: Free tier capped at 3 try-ons/day (BR-02)

**Domain change**: zero — existing `Item` and `Outfit` entities unchanged

---

### Resale Listing Generator (Phase 3)

**Seam**: `WardrobeQueryPort.GetItemById` + new `ResalePort`

What changes:
- New inbound port: `ResaleListingPort` with `generateListing(userId, itemId) → ListingDraft`
- New outbound port: `ListingExportPort` with `publishListing(userId, draft, platform) → ListingResult`
- New adapters: `VintedExportAdapter`, `DepopExportAdapter`
- Item entity gains `resale_status` (nullable) — backward compatible

**Domain change**: minimal — `Item` gains one optional field

---

### Gap Detection / Smart Shopping (Phase 3)

**Seam**: New use case, reads existing wardrobe data

What changes:
- New inbound port: `GapAnalysisPort` with `detectGaps(userId) → Gap[]`
- New outbound port: `ShoppingPartnerPort` with `fetchRecommendations(gaps) → ShoppingItem[]`
- New adapters per affiliate partner (Zalando, ASOS)
- Reads existing `ItemRepositoryPort` — no data model changes

**Domain change**: zero to existing domain

---

### Social Closet & Influencer Feed (Phase 3)

**Seam**: Separate bounded context with anti-corruption layer

What changes:
- New bounded context `SocialCloset` with own entities (`CreatorProfile`, `PublicCloset`, `SharedLook`)
- Anti-corruption layer translates `Wardrobe` (private) → `PublicCloset` (public view)
- New database tables (social schema)
- Feature flag controls activation per user

**Domain change**: zero to Wardrobe Management domain

---

## 8. GDPR Component Map

| Component | Data Held | Retention | Deletion |
|-----------|----------|-----------|---------|
| `Item` | Photo URLs, metadata, category | User lifetime | Cascade on account delete |
| `WearEvent` | Item IDs, date | User lifetime | Cascade on account delete |
| `StyleProfile` | Style preferences | User lifetime | Cascade on account delete |
| `WeatherCache` | City + forecast | 24 hours | Auto-expire TTL |
| `ConsentLog` | Consent timestamp, version | Legal minimum (3 years) | NOT deleted on account delete (regulatory requirement) |
| `BodyProfile` (Phase 3) | Height, weight, body type | User lifetime | Independent deletion, separate consent |
| `ImageStore` (S3) | Garment photos | User lifetime | Lambda cleanup job on account delete |
| Analytics | Aggregated, anonymized | Indefinite | Not personal data |
