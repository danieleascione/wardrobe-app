# Definition of Ready Validation — PocketWardrobe MVP

**Validation date**: 2026-02-28
**Validator**: Luna (Experience-Driven Requirements Analyst)
**DoR is a hard gate**: Stories must pass all 8 items before DESIGN wave handoff.

---

## DoR Item Definitions

| # | Item | Pass Criteria |
|---|------|---------------|
| 1 | Problem statement clear and in domain language | Real user pain, specific situation, domain terms (not "users need X") |
| 2 | User/persona identified with specific characteristics | Named persona with role, context, motivation — not "User" |
| 3 | At least 3 domain examples with real data | Real names, realistic data, distinct scenarios (happy + edge + error) |
| 4 | UAT in Given/When/Then (3-7 scenarios) | Scenarios in acceptance-criteria.md; testable and automatable |
| 5 | AC derived from UAT | Bullet AC traceable to at least one scenario each |
| 6 | Story right-sized (1-3 days, 3-7 scenarios) | Not an epic; demonstrable in single session |
| 7 | Technical notes: constraints and dependencies | Identifies constraints, blocking dependencies |
| 8 | Dependencies resolved or tracked | Known blockers have owner and resolution path |

---

## US-01: First-Time Style Calibration

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Sofia finds it soul-crushing to fill in lengthy setup forms before seeing any value" — domain language, specific pain |
| Persona identified | PASS | Sofia Marchetti, 28, marketing professional, Milan, prior abandonment history documented |
| 3+ domain examples | PASS | Sofia (classic/work), Chiara (bold/casual), Marco (skipped/default) — 3 distinct profiles |
| UAT scenarios (3-7) | PASS | 3 scenarios (AC-01-01 through AC-01-03) — within 3-7 range |
| AC derived from UAT | PASS | 6 AC bullets — each traceable to at least one scenario |
| Right-sized | PASS | 1 day effort estimate; 3 scenarios; demonstrable in single session |
| Technical notes | PASS | Style_profile schema defined, default values specified, "never block entry" constraint documented |
| Dependencies tracked | PASS | No upstream dependencies; blocks US-02 (documented) |

**DoR Status: PASSED**

---

## US-02: Camera-Based Item Digitization

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Sofia has tried manual cataloging in spreadsheets twice and abandoned both" — specific behavioral evidence |
| Persona identified | PASS | Sofia Marchetti, first digitization session, motivated by 5-item outfit unlock |
| 3+ domain examples | PASS | Camel coat (success), black jeans (lighting issue), linen blazer (category error) — 3 distinct scenarios |
| UAT scenarios (3-7) | PASS | 5 scenarios (AC-02-01 through AC-02-05) — within range |
| AC derived from UAT | PASS | 8 AC bullets; photo_url, item_count, lighting threshold, network retry all traceable to scenarios |
| Right-sized | PASS | 2-3 day effort; 5 scenarios; demonstrable — photograph and see AI result |
| Technical notes | PASS | Nano Banana API, CDN, EXIF stripping, compression, confidence threshold — all specified |
| Dependencies tracked | PASS | TT-01 spike documented as blocker; CDN setup on CTO; item_record schema defined |

**DoR Status: PASSED**

---

## US-03: Progress-Driven Wardrobe Building to First Outfit

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Empty grid with no reward for progress" — Sofia's prior app abandonment pattern |
| Persona identified | PASS | Sofia mid-digitization, 1-4 items, motivation flagging without visible progress |
| 3+ domain examples | PASS | Single session to 5 items, cross-session resume, occasion mismatch at threshold |
| UAT scenarios (3-7) | PASS | 4 scenarios (AC-03-01 through AC-03-04) — within range |
| AC derived from UAT | PASS | 7 AC bullets; progress persistence, celebration trigger, occasion fallback all traced |
| Right-sized | PASS | 1-2 day effort; primarily UI state management; 4 scenarios |
| Technical notes | PASS | item_count derived from active items only; one-time celebration flag per user; concurrent submission handling noted |
| Dependencies tracked | PASS | Depends on US-02 (item_record), US-05 (outfit engine trigger) — both documented |

**DoR Status: PASSED**

---

## US-04: Occasion and Weather-Aware Outfit Suggestion

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Without occasion and weather context, suggestions feel like random combinations, not curated styling" — domain language |
| Persona identified | PASS | Sofia, regular user (1+ week), planning for specific occasions in Milan |
| 3+ domain examples | PASS | Monday work/cold weather, Saturday casual/mild, weather API down — 3 distinct contexts |
| UAT scenarios (3-7) | PASS | 5 scenarios (AC-04-01 through AC-04-05) — within range |
| AC derived from UAT | PASS | 8 AC bullets; weather display, occasion override, rotation, fallback all traceable |
| Right-sized | PASS | 2-3 day effort (outfit engine + weather integration); 5 scenarios |
| Technical notes | PASS | Weather API caching (midnight TTL), city-level location, ephemeral occasion override, outfit_history dependency |
| Dependencies tracked | PASS | Depends on US-01 (style_profile), US-02 (items with occasion_tags), weather API integration; all tracked |

**DoR Status: PASSED**

---

## US-05: Item Swap Within Daily Outfit

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "She wants to swap just the shoes without requesting an entirely new outfit" — concrete behavioral need |
| Persona identified | PASS | Sofia, has received daily outfit, needs agency over one element; specific swap scenario (loafers → ankle boots) |
| 3+ domain examples | PASS | Shoe swap, top swap for formality, only one coat available — 3 distinct scenarios |
| UAT scenarios (3-7) | PASS | 3 scenarios (AC-05-01 through AC-05-03) — at minimum of range |
| AC derived from UAT | PASS | 6 AC bullets; drawer content, update speed, empty state, wear_event traceability |
| Right-sized | PASS | 1-2 day effort; 3 scenarios; demonstrable in single session |
| Technical notes | PASS | outfit_suggestion immutability, wear_event with final_item_ids, ephemeral swap state documented |
| Dependencies tracked | PASS | Depends on US-02 (category-tagged items), US-04 (outfit suggestion rendered) — documented |

**DoR Status: PASSED**

---

## US-06: Daily Outfit Habit and Unworn Item Awareness

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "She starts to wonder if the other 23 items are in her wardrobe at all" — emotional truth, domain language |
| Persona identified | PASS | Sofia, established user (3+ weeks, 20+ items), specific wardrobe stats scenario |
| 3+ domain examples | PASS | 14 unworn items revealed, all items worn (positive state), new user below threshold — 3 distinct states |
| UAT scenarios (3-7) | PASS | 4 scenarios (AC-06-01 through AC-06-03 plus the threshold scenario) — within range |
| AC derived from UAT | PASS | 6 AC bullets; eligibility threshold, worn_count accuracy, outfit generation from unworn item |
| Right-sized | PASS | 1-2 day effort; primarily analytics + UI; 4 scenarios |
| Technical notes | PASS | Derived stats, worn_count definition (30-day window), eligibility gate (15 items, 7 days) |
| Dependencies tracked | PASS | Depends on US-02, US-05 (wear_events), US-04 (host card) — all documented |

**DoR Status: PASSED**

---

## Technical Task: TT-01 — Nano Banana API Integration Spike

| DoR Item | Status | Evidence |
|----------|--------|---------|
| Problem statement clear | PASS | "Does not block US-02 AC until latency/quality measured" — specific learning objective |
| Persona identified | N/A | Technical task — not user-facing |
| 3+ domain examples | N/A | Spike — learning objectives substitute |
| UAT scenarios | N/A | Exit criteria documented (latency, cost, confidence score) |
| AC derived from UAT | PASS | Clear exit criteria: P95 latency, cost projection, sample quality rating, provider decision |
| Right-sized | PASS | 5-day timebox; single CTO resource; clear learning objectives |
| Technical notes | PASS | Specific questions to answer documented |
| Dependencies tracked | PASS | Blocks US-02 (item digitization) — critical path identified |

**DoR Status: PASSED (spike format)**

---

## Overall DoR Summary

| Story | DoR Status | Notes |
|-------|-----------|-------|
| US-01 Style Calibration | PASSED | Ready for DESIGN wave |
| US-02 Item Digitization | PASSED | Ready pending TT-01 spike completion |
| US-03 Progress to First Outfit | PASSED | Ready for DESIGN wave |
| US-04 Outfit Suggestion (Occasion + Weather) | PASSED | Ready for DESIGN wave |
| US-05 Item Swap | PASSED | Ready for DESIGN wave |
| US-06 Unworn Item Awareness | PASSED | Ready for DESIGN wave |
| TT-01 API Spike | PASSED | Must complete before US-02 DESIGN wave |

**All stories pass DoR. Package is ready for DESIGN wave handoff.**

---

## MVP Scope Recommendation (Final)

### Walking Skeleton (Founders Alpha, Month 2)

Include in walking skeleton:
- **US-01**: Style Calibration (prerequisite to all other value)
- **US-02**: Item Digitization (core job, foundational)
- **US-03**: Progress to First Outfit (the "aha moment" — validates the loop)
- **TT-01**: Nano Banana API Spike (must complete in Week 1 of Month 2)

Do NOT include in walking skeleton:
- US-04 (outfit intelligence): needs weather integration; validate basic digitization first
- US-05, US-06: build on top of established patterns

### MVP (Closed Beta, 200 Users, Month 3)

Add in Month 3:
- **US-04**: Occasion + Weather-Aware Outfit Suggestion (daily engagement driver)
- **US-05**: Item Swap (user agency — avoids feeling constrained)
- **US-06**: Unworn Item Awareness (seeds future resale/gap engagement)

### Deferred (Phase 3, Month 4+)

- Virtual Try-On: highest technical risk; defer until wardrobe corpus is sufficient
- Resale Listing Generator: depends on wardrobe quality and user trust
- Smart Shopping / Gap Detection: depends on affiliate partnerships
- Social Closet: significant additional scope; growth feature, not retention feature

### Highest-Risk Assumptions to Validate First

**In Alpha (founders, Month 2)**:
1. Can users digitize 15 items in under 30 minutes? (Funnel measurement, steps 1-4)
2. Does the first outfit suggestion feel "right" to the user? (Founder interviews, outfit acceptance rate)
3. Is AI recognition accuracy trusted? (Correction rate < 15%)

**In Beta (200 users, Month 3)**:
1. Do users return on Day 7? (D7 retention target: > 35%)
2. Is the daily outfit card the entry point, or something else? (Session start screen analytics)
3. Does weather context meaningfully improve suggestion acceptance? (A/B test: weather vs no weather)

**These six measurements should drive all product decisions before Phase 3 investment.**
