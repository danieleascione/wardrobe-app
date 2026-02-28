# PocketWardrobe — Project Intelligence

## Project Overview

PocketWardrobe is an AI-powered mobile wardrobe management app. Users digitize physical garments via camera, receive AI-curated daily outfit suggestions contextualised by weather and occasion, and track wear history.

**Phase**: Walking Skeleton → Closed Beta (MVP)
**Team**: 4 people (CEO, CTO, Product Designer, Content Manager)
**Timeline**: Month 1 foundations, Month 2-3 MVP, Month 4-9 launch

---

## Development Paradigm

**OOP TypeScript** — see `docs/adrs/ADR-006-development-paradigm.md`

### What this means in practice

- Domain entities are **classes**: `Item`, `Wardrobe`, `Outfit`, `StyleProfile`, `WearEvent`
- Ports are **TypeScript interfaces**: `ItemRepositoryPort`, `AIProcessorPort`, etc.
- Use cases are **classes with injected port dependencies** via constructor
- Adapters are **classes implementing port interfaces**: `NanaBananaAdapter`, `SupabaseItemRepository`, etc.
- Entity fields are `readonly` except where explicitly mutated through intent-revealing methods
- `OutfitSuggestion` is immutable after creation — no setters on `item_ids`
- FP composition may be used **internally within use case methods** where it produces cleaner transformation logic — software-crafter decides during GREEN + REFACTOR

### What NOT to do

- Do not import external libraries (AWS SDK, Supabase client, Axios) inside `packages/domain`
- Do not reference adapter implementations from use cases — inject port interfaces only
- Do not persist `WardrobeStats` — it is always derived at query time
- Do not mutate `OutfitSuggestion.item_ids` — create a new `WearEvent` with final item set

---

## Architecture

**Pattern**: Hexagonal Architecture (Ports and Adapters)
**Reference**: `docs/design/architecture-design.md`

### Dependency rule (strictly enforced)

```
Domain core → nothing
Use cases → domain entities + outbound port interfaces
Adapters → port interface they implement + external library
Mobile → shared-types + API (never imports domain packages directly)
```

### Monorepo package structure

```
packages/
  domain/          # Pure TS domain core — no framework dependencies
  mobile/          # React Native + Expo app
  functions/       # Lambda handlers (thin adapters invoking use cases)
  shared-types/    # TypeScript interfaces shared between mobile and backend
```

Enforce import rules with `dependency-cruiser`.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native 0.74 + Expo SDK 51 |
| Backend | Node.js 22 LTS + AWS Lambda |
| Database | PostgreSQL 16 via Supabase (EU region) |
| AI | Nano Banana API (async via SQS) |
| Weather | Open-Meteo (free, cached per day per city) |
| Storage | AWS S3 + CloudFront CDN |
| Auth | Supabase Auth (JWT RS256) |
| Push | Expo Notifications (APNs + FCM) |
| Image processing | Sharp (Lambda layer) |
| Mobile state | React Query + MMKV |
| Mobile grid | @shopify/flash-list |

Full rationale in `docs/design/technology-stack.md` and `docs/adrs/`.

---

## Domain Language

Use this language consistently across code, tests, and documentation.

| Term | Definition |
|------|-----------|
| `Item` | A single garment owned by the user |
| `Wardrobe` | User's complete collection of owned Items in the app |
| `Outfit` | A complete combination of 3+ Items suggested by the AI (immutable after creation) |
| `WearEvent` | Record of user accepting an outfit (final items may differ from Outfit after swap) |
| `StyleProfile` | User style preferences (archetype, occasions, palette) |
| `Digitization` | The act of photographing and cataloging an Item into the Wardrobe |
| `Occasion` | Context label for when an outfit is appropriate: work | casual | sport | events |
| `WardrobeStats` | Derived: total items + unworn count. Never persisted. |

---

## Business Rules (implemented in domain core)

| Rule | Enforcement |
|------|------------|
| BR-01 | First outfit suggestion requires wardrobe.item_count >= 5 |
| BR-03 | Outfit must contain >= 3 Items |
| BR-04 | No exact item combination repeat: 7-day window (>= 15 items) or 3-day (< 15 items) |
| BR-05 | WearEvent created only on explicit user accept — not on view |
| BR-06 | item_record.photo_url must reference background-removed version |
| BR-07 | Weather cache invalidates at midnight local time |
| BR-08 | Outfits referencing deleted items must be invalidated |
| BR-09 | Default StyleProfile on calibration skip: classic / work+casual / neutral |
| BR-10 | AI correction rate tracked per category; > 25% triggers monitoring alert |

---

## Key Design Decisions

- **Outfit immutability**: `OutfitSuggestion` is write-once. Item swap creates a new `WearEvent` with `final_item_ids` — it does NOT mutate the suggestion.
- **WardrobeStats is derived**: `worn_count` per item computed from `WearEvent` records, not stored on `Item`. This is a query-time join, not a cached field.
- **item_count via DB trigger**: Wardrobe.item_count maintained by a PostgreSQL trigger on the `items` table (INSERT active / UPDATE to deleted). Do not compute it in application code.
- **GDPR cascade**: FK cascades handle user data deletion. `consent_log` rows are NOT deleted (regulatory retention).
- **EXIF stripping**: Always strip EXIF before writing to S3. Never store GPS metadata.

---

## GDPR Requirements

- Photo consent must be logged in `consent_log` before first upload (version + timestamp)
- All data in EU region (Supabase eu-west-1, S3 eu-west-1)
- EXIF stripped in Lambda before any S3 write
- Face detection before AI submission — upload blocked if face detected
- Account deletion: cascade + S3 cleanup within 30 seconds
- `consent_log` NOT deleted on account delete (3-year regulatory hold)
- Location stored at city level only — never GPS coordinates

---

## Seams for Deferred Features

Do not implement these in MVP. Architecture accommodates them via ports.

| Feature | Seam |
|---------|------|
| Virtual Try-On | `TryOnRenderingPort` (outbound, new adapter) |
| Resale Listing | `ResaleListingPort` (new inbound) + `ListingExportPort` (new outbound) |
| Gap Detection | `GapAnalysisPort` (new inbound) + `ShoppingPartnerPort` (new outbound) |
| Social Closet | Separate bounded context with anti-corruption layer |

---

## Test Strategy (TDD)

- Domain use cases: unit tests against port mocks — no database or HTTP
- Adapters: integration tests with real infrastructure (Supabase local, mock S3)
- Mobile: React Native Testing Library for component tests
- E2E: Maestro or Detox for walking skeleton flows
- AI quality: correction rate tracked in `ai_quality_log`, not mocked in tests
