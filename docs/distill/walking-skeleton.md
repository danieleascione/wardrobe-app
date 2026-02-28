# PocketWardrobe — Walking Skeleton Implementation Guide

**DISTILL wave output**
**Date**: 2026-02-28

---

## Purpose

This guide tells the software-crafter what must be built before any other acceptance test can be enabled. The walking skeleton scenario in `walking-skeleton.feature` is the entry criterion for all subsequent development. It must pass on day one of the DELIVER wave.

---

## The Walking Skeleton Scenario

**File**: `tests/features/mvp/acceptance/walking-skeleton.feature`
**Tags**: `@walking_skeleton @smoke`
**Status**: ZERO `@pending` tags — must be runnable on day 1

```gherkin
Scenario: Sofia calibrates her style, digitizes 5 items, and unlocks her first outfit
```

This scenario is demo-able to a non-technical stakeholder. The question it answers: "Can a user complete the core loop of this app from start to first payoff?"

---

## What the Walking Skeleton Proves

The skeleton validates the three-step core loop defined in the requirements:

```
Step 1: StyleCalibrationPort.CompleteCalibration
         → StyleProfile created and persisted

Step 2: ItemDigitizationPort.InitiateDigitization + ConfirmItem (x5)
         → Wardrobe populated with 5 active Items

Step 3: OutfitSuggestionPort.GetDailyOutfit
         → OutfitSuggestion returned with 3+ Items from wardrobe
```

All three ports must be wired and functional before the skeleton passes.

---

## Build Order (Recommended)

The software-crafter should build components in this order to make the skeleton pass as quickly as possible.

### Phase 1: Domain Core (no dependencies)

Build these first — they have no external dependencies:

1. `StyleProfile` entity + value objects (`Occasion`, `Archetype`, `Palette`)
2. `Item` entity + value objects (`Color`, `Category`, `Season`)
3. `Wardrobe` aggregate (enforces item_count, 5-item unlock gate)
4. `OutfitSuggestion` entity + `WearEvent` entity

No ports, no adapters, no database. Pure TypeScript.

### Phase 2: Inbound Port Interfaces

Define the TypeScript interfaces for all inbound ports used by the skeleton:

- `StyleCalibrationPort` — `completeCalibration`, `skipCalibration`
- `ItemDigitizationPort` — `initiateDigitization`, `confirmItem`
- `OutfitSuggestionPort` — `getDailyOutfit`, `acceptOutfit`

These match the interfaces in `tests/features/mvp/acceptance/steps/world.ts`.

### Phase 3: Outbound Port Interfaces

Define interfaces for ports required by the skeleton use cases:

- `AIProcessorPort` — `processImage`
- `WeatherServicePort` — `getTodaysForecast`
- `ImageStorePort` — `storeImage`
- `FaceDetectionPort` — `detectFace`
- `ItemRepositoryPort` — `saveItem`, `findItemsByUser`, `findItemById`, `getItemCount`
- `StyleProfileRepositoryPort` — `saveStyleProfile`, `findStyleProfile`
- `OutfitRepositoryPort` — `saveOutfitSuggestion`, `findRecentOutfits`

### Phase 4: Use Case Implementations

Implement the three use cases that the skeleton exercises:

1. `StyleCalibrationUseCase` — implements `StyleCalibrationPort`, depends on `StyleProfileRepositoryPort`
2. `ItemDigitizationUseCase` — implements `ItemDigitizationPort`, depends on `AIProcessorPort`, `ImageStorePort`, `FaceDetectionPort`, `ItemRepositoryPort`
3. `OutfitSuggestionUseCase` — implements `OutfitSuggestionPort`, depends on `WeatherServicePort`, `ItemRepositoryPort`, `OutfitRepositoryPort`, `StyleProfileRepositoryPort`

The use case factories in `tests/features/mvp/acceptance/steps/support/use-case-factories.ts` show the expected constructor signatures and behaviour. The acceptance tests use these factories directly — the production implementations must honour the same contracts.

### Phase 5: Wire the Test World

The test world (`world.ts`) and hooks (`support/hooks.ts`) already contain the wiring logic. Once the use case implementations exist in `packages/domain/use-cases/`, update the imports in `use-case-factories.ts` to point to the production implementations instead of the inline test stubs.

### Phase 6: Run the Walking Skeleton

```bash
npx cucumber-js tests/features/mvp/acceptance/walking-skeleton.feature
```

The skeleton should fail initially because business logic is not implemented. Each step failure directs the inner TDD loop. When the skeleton passes, the first outer loop iteration is complete.

---

## Mock Adapter Contracts

The acceptance tests inject mock adapters for external services. The mocks must honour these response shapes exactly.

### AIProcessorPort mock (`MockAIProcessorPort`)

Must return:
```typescript
{
  backgroundRemovedUrl: string,  // URL format: any valid HTTPS URL
  category: string,              // e.g., "Outerwear"
  subcategory: string,           // e.g., "Coat"
  colorPrimary: string,          // e.g., "Camel / Warm tan"
  seasons: string[],             // e.g., ["spring", "autumn", "winter"]
  occasions: string[],           // e.g., ["work", "casual"]
  confidence: number,            // 0.0–1.0
  suggestedName: string,
  faceDetected: boolean,
}
```

### WeatherServicePort mock (`MockWeatherServicePort`)

Must return `WeatherContext | null`:
```typescript
{
  city: string,          // e.g., "Milan"
  date: Date,
  tempCelsius: number,   // e.g., 7
  condition: string,     // e.g., "partly_cloudy"
} | null  // null signals service unavailable
```

### ImageStorePort mock (`MockImageStorePort`)

Must return:
```typescript
{
  thumbnailUrl: string,   // pattern: https://cdn.pocketwardrobe.com/{userId}/{itemId}/thumb.webp
  originalUrl: string,    // pattern: s3://pocket-wardrobe-prod/{userId}/{itemId}/original.jpg
}
```

---

## Litmus Test (Before Marking Skeleton Done)

Before declaring the walking skeleton complete, verify all four criteria:

1. The scenario title ("Sofia calibrates her style, digitizes 5 items, and unlocks her first outfit") describes a user goal, not a technical flow.
2. Every `Given`/`When` step describes user context or user action — no system internals.
3. Every `Then` step describes what Sofia sees or can do — no internal side effects like "row inserted in database."
4. A non-technical stakeholder can confirm: "Yes, that is what users need." (Walk through the scenario with the product owner before marking complete.)

---

## First Scenario to Enable After Skeleton

After the walking skeleton passes, enable scenarios in this order:

1. `milestone-1-style-calibration.feature` — AC-01-01 (basic calibration save)
2. `milestone-2-item-digitization.feature` — AC-02-01 (successful classification)
3. `milestone-3-outfit-unlock.feature` — AC-03-02 (5th item celebration)
4. `milestone-4-outfit-suggestion.feature` — AC-04-01 (work outfit with weather)
5. Continue through each feature file, enabling one scenario at a time

Each scenario enabled is a new outer-loop cycle. Remove the `@pending` tag, watch it fail, implement the minimal code to make it pass, commit, move to next.

---

## Configuration

### Cucumber configuration

Create `cucumber.json` in the project root:

```json
{
  "default": {
    "require": [
      "tests/features/mvp/acceptance/steps/**/*.ts",
      "tests/features/mvp/acceptance/steps/support/hooks.ts"
    ],
    "requireModule": ["ts-node/register"],
    "format": ["progress", "json:reports/cucumber-report.json"],
    "tags": "not @pending"
  },
  "all": {
    "tags": ""
  }
}
```

Running `npx cucumber-js` with the default profile runs only enabled scenarios (skips `@pending`). Running with the `all` profile runs all scenarios, showing pending ones as skipped.

### TypeScript configuration

The test files use TypeScript. Add a `tsconfig.json` in `tests/`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "rootDir": ".",
    "baseUrl": "."
  }
}
```
