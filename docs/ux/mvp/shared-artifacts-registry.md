# Shared Artifacts Registry — PocketWardrobe MVP

## Purpose

Every data value that appears in more than one place across the wardrobe digitization journey is tracked here with its single source of truth, all consumers, and integration risk. Untracked artifacts are the primary cause of horizontal integration failures.

---

## Registry

### style_profile

| Field | Value |
|-------|-------|
| Source of Truth | `users/{user_id}/style_profile` |
| Owner | User Profile service |
| Integration Risk | HIGH — incorrect style profile silently produces irrelevant suggestions |
| Validation | Compare suggestion_occasion_tags against style_profile.occasion_priorities before rendering |

**Schema**:
```json
{
  "style_archetype": "minimalist | classic | bold | relaxed",
  "occasion_priorities": ["work", "casual", "sport", "events"],
  "color_palette": "neutral | earthy | monochrome | vibrant",
  "created_at": "ISO 8601",
  "last_updated": "ISO 8601"
}
```

**Consumers**:
- Step 1 (Onboarding): written here
- Step 4 (Wardrobe building): read for personalized encouragement messages
- Step 5 (First outfit): read by outfit suggestion engine
- Step 6 (Daily outfit): read by outfit suggestion engine daily
- Phase 3 (Gap detection): read to qualify gap recommendations

**Integration Check**: Outfit engine must fail fast if style_profile is missing — do not fall back to defaults silently. Surface "Complete your style profile" prompt.

---

### item_record

| Field | Value |
|-------|-------|
| Source of Truth | `items/{item_id}` |
| Owner | Wardrobe service |
| Integration Risk | HIGH — incorrect metadata (especially color and occasion_tags) produces wrong outfit suggestions |
| Validation | item_id must appear in wardrobe/{user_id}/items before being included in any outfit_suggestion.item_ids |

**Schema**:
```json
{
  "item_id": "UUID",
  "user_id": "UUID",
  "photo_url": "CDN URL — background-removed version",
  "raw_photo_url": "CDN URL — original",
  "category": "outerwear | tops | bottoms | footwear | accessories",
  "subcategory": "string",
  "color_primary": "string",
  "color_secondary": "string | null",
  "fabric_estimate": "string",
  "season": ["spring", "summer", "autumn", "winter"],
  "occasion_tags": ["work", "casual", "sport", "events"],
  "name": "string",
  "manual_classification": "boolean",
  "worn_count": "integer",
  "last_worn_at": "ISO 8601 | null",
  "created_at": "ISO 8601"
}
```

**Consumers**:
- Step 3 (AI Processing): written here
- Step 4 (Wardrobe grid): read for display (photo_url, name, category)
- Step 5 (Outfit suggestion): read by engine (occasion_tags, color_primary, season)
- Step 6 (Daily outfit): read for rendering and stats
- Step 6 (Unworn items view): filtered by worn_count = 0 in past 30 days
- Phase 3 (Resale listing): read for listing metadata
- Phase 3 (Gap detection): read for gap analysis

**Integration Check**: photo_url must always point to the background-removed version. If background removal has not completed, do not expose photo_url — use a placeholder. Never render raw_photo_url in outfit visualizations.

---

### wardrobe

| Field | Value |
|-------|-------|
| Source of Truth | `wardrobes/{user_id}/items` (ordered collection of item_ids) |
| Owner | Wardrobe service |
| Integration Risk | HIGH — item_count drives the progress bar and outfit unlock trigger |
| Validation | item_count = count of confirmed items (status="active") — drafts and failed uploads excluded |

**Schema**:
```json
{
  "user_id": "UUID",
  "item_ids": ["UUID", "UUID", ...],
  "item_count": "integer (derived)",
  "last_updated": "ISO 8601"
}
```

**Consumers**:
- Step 2 (Photo capture): reads item_count for progress bar display
- Step 4 (Wardrobe grid): reads full item list for grid rendering
- Step 5 (Outfit engine): reads item_ids to source outfit items
- Step 6 (Daily outfit): reads item_ids; reads item_count for stats card
- Step 6 (Unworn items): filtered from this collection

**Integration Check**: item_count must be a derived count from confirmed items only. A failed upload must NOT increment item_count. The 5-item unlock threshold depends on this accuracy.

---

### weather_context

| Field | Value |
|-------|-------|
| Source of Truth | `weather-service/{date}/{location}` (external API, cached per-day) |
| Owner | Weather integration service |
| Integration Risk | MEDIUM — stale weather data produces wrong outfit context; graceful degradation required |
| Validation | Cache key must include date. New day = new fetch. Fallback renders outfit without weather context. |

**Schema**:
```json
{
  "location": "Milan, IT",
  "date": "YYYY-MM-DD",
  "temperature_celsius": 9,
  "temperature_feels_like": 7,
  "condition": "partly cloudy | rain | sunny | ...",
  "precipitation_probability": 0.2,
  "cached_at": "ISO 8601"
}
```

**Consumers**:
- Step 5 (First outfit): read for "Milan, 9°C" display and outfit selection logic
- Step 6 (Daily outfit card): read for daily weather context display

**Integration Check**: weather_context.date must match the outfit_suggestion.date. If they differ, re-fetch weather data before rendering. Do not show yesterday's weather on today's outfit card.

---

### outfit_suggestion

| Field | Value |
|-------|-------|
| Source of Truth | `outfit-suggestions/{suggestion_id}` |
| Owner | Outfit suggestion service |
| Integration Risk | HIGH — orphaned item_ids (items deleted from wardrobe) must be detected before rendering |
| Validation | Before rendering any outfit_suggestion, validate all item_ids exist in wardrobe/{user_id}/items |

**Schema**:
```json
{
  "suggestion_id": "UUID",
  "user_id": "UUID",
  "item_ids": ["UUID", "UUID", "UUID"],
  "occasion": "work | casual | sport | events",
  "weather_context_id": "reference to weather_context",
  "reasoning": "string — human readable",
  "date_suggested": "YYYY-MM-DD",
  "user_accepted": "boolean | null",
  "user_swapped_items": ["UUID"],
  "final_item_ids": ["UUID"] ,
  "created_at": "ISO 8601"
}
```

**Consumers**:
- Step 5: written here, read for immediate display
- Step 6: read for outfit history (rotation engine)
- wear_event: references outfit_suggestion.suggestion_id

**Integration Check**: outfit_suggestion.item_ids must be validated against wardrobe on every render. If any item_id is not found in wardrobe, log error and regenerate suggestion. Do not render broken outfit.

---

### outfit_history

| Field | Value |
|-------|-------|
| Source of Truth | `outfit-suggestions/{user_id}/history` (ordered by date_suggested desc) |
| Owner | Outfit suggestion service |
| Integration Risk | MEDIUM — stale history causes repeat suggestions; history must update immediately on acceptance |
| Validation | Rotation engine must read history before generating a new suggestion |

**Consumers**:
- Step 6 (Daily outfit engine): read to avoid repetition
- Step 6 (Outfit stats): "Wearing this week: N outfits so far"

---

### wear_event

| Field | Value |
|-------|-------|
| Source of Truth | `wear-events/{event_id}` |
| Owner | Wardrobe analytics service |
| Integration Risk | MEDIUM — incorrect wear_events cause inaccurate unworn-item stats |
| Validation | A wear_event must only be created when user explicitly accepts an outfit (tap "This works for me" or "Save outfit"). Viewing does not count as wearing. |

**Schema**:
```json
{
  "event_id": "UUID",
  "user_id": "UUID",
  "outfit_suggestion_id": "UUID",
  "date": "YYYY-MM-DD",
  "items_worn": ["UUID"]
}
```

**Consumers**:
- item_record.worn_count: incremented per item in items_worn
- item_record.last_worn_at: updated per item
- wardrobe stats (Step 6): "Unworn this month: N items"
- Phase 3 (Resale prompt): items with worn_count = 0 and age > 180 days

**Integration Check**: items_worn must cross-reference wardrobe to ensure all item_ids are still active. If an item was deleted, skip worn_count update for that item.

---

### wardrobe_stats (derived)

| Field | Value |
|-------|-------|
| Source of Truth | Derived at query time from wardrobe + wear_events — not stored |
| Owner | Wardrobe analytics service |
| Integration Risk | LOW — derived read-only, regenerated on demand |

**Derived Fields**:
- `total_items`: count of active items in wardrobe
- `worn_this_month`: count of items with at least one wear_event in past 30 days
- `unworn_count`: total_items - worn_this_month
- `most_worn_item`: item_id with highest worn_count

**Consumers**:
- Step 6 (Daily outfit card): "Your wardrobe: 23 items | Unworn this month: 14 items"
- Step 6 (Unworn items view): filter items by worn_count = 0 in past 30 days

---

## Integration Validation Checklist

Run before each phase handoff:

- [ ] Every displayed ${variable} in journey visual mockups has a documented source of truth in this registry
- [ ] photo_url always points to background-removed version; raw_photo_url never shown in outfit views
- [ ] wardrobe.item_count excludes failed uploads and drafts
- [ ] weather_context.date matches outfit_suggestion.date before rendering
- [ ] outfit_suggestion.item_ids validated against wardrobe before every render
- [ ] wear_event only created on explicit user acceptance, not on view
- [ ] style_profile missing = prompt to complete, not silent fallback
- [ ] outfit_history consulted before generating each new outfit suggestion

---

## High-Risk Integration Points

| Risk | Steps Affected | Mitigation |
|------|---------------|-----------|
| item_count includes failed uploads | Steps 2-5 | Only count items with status="active" |
| photo_url points to raw (non-background-removed) image | Steps 4-6 | Gate photo_url write on background removal completion |
| Outfit rendered with item from deleted wardrobe | Steps 5-6 | Validate all item_ids on render, not at suggestion creation |
| Yesterday's weather shown on today's outfit | Step 6 | Cache key must include date; TTL = midnight local time |
| Style profile not propagated to first outfit | Step 5 | Outfit engine must explicitly read style_profile at execution time |
