# PocketWardrobe MVP — User Stories

**Traceability**: Each story traces to one or more JTBD job stories.
**All stories**: DoR validated in `dor-checklist.md`
**Acceptance Criteria**: In `acceptance-criteria.md` (full BDD Gherkin)

---

## Epic: Core Wardrobe Loop

The core value proposition: digitize clothes → get styled.

---

## US-01: First-Time Style Calibration

**Traces to**: JS-01 (Wardrobe Visibility), JS-04 (Daily Outfit Intelligence)
**MoSCoW**: Must Have (Walking Skeleton)

### Problem

Sofia Marchetti is a 28-year-old marketing professional who has downloaded four wardrobe apps in the past two years and abandoned all of them. She finds it soul-crushing to fill in lengthy setup forms before seeing any value. By the time she's finished configuring preferences, she's already mentally checked out.

### Who
- Fashion-conscious professional (25-35) | First app launch | Motivated to solve morning outfit paralysis

### Solution

A 3-question style calibration screen that takes under 60 seconds to complete and immediately promises — and delivers — a personalized first outfit suggestion. The calibration is framed as "unlocking" personalized suggestions, not as a required setup form.

### Domain Examples

**1: Classic work-focused profile (Sofia)**
Sofia selects "Classic" style, "Work" and "Casual" occasions, "Neutral palette." Within 5 minutes of first launch, she sees a work outfit built from her first 5 items. She feels the app understood her without interrogating her.

**2: Bold weekend-focused profile (Chiara)**
Chiara selects "Bold" style, "Casual" and "Events" occasions, "Vibrant" palette. Her first suggestion prioritizes brighter items and casual layering rather than professional minimalism.

**3: Skipped calibration (impatient user)**
Marco taps the X to skip calibration. The app proceeds with a classic/work/neutral default and shows a banner: "Complete your style profile for better suggestions." His first outfit is generic but still functional.

### UAT Scenarios

**Scenario 1**: Successful calibration — see `acceptance-criteria.md` > AC-01-01

**Scenario 2**: Skipped calibration with default fallback — see `acceptance-criteria.md` > AC-01-02

**Scenario 3**: Calibration data persists across sessions — see `acceptance-criteria.md` > AC-01-03

### Acceptance Criteria

- [ ] Calibration requires no more than 3 questions to complete
- [ ] Each question has visually distinct, tappable options (not text fields)
- [ ] Completed calibration creates style_profile stored server-side
- [ ] Skipped calibration creates default style_profile (classic/work/neutral)
- [ ] Calibration can be updated from settings at any time without data loss
- [ ] The calibration screen provides a clearly visible dismiss option on every question (not only on the first screen)

### Technical Notes

- style_profile must be available to outfit engine before first suggestion renders
- Default values for skipped calibration: archetype="classic", occasions=["work","casual"], palette="neutral"
- Calibration screen must be skippable — never block app entry
- No authentication required for calibration — anonymous profile until account created

### Dependencies

- None (first step in the journey; no upstream dependencies)
- Blocks: US-02 (digitization needs style_profile for occasion-tagged progress messages)

---

## US-02: Camera-Based Item Digitization

**Traces to**: JS-01 (Wardrobe Visibility)
**MoSCoW**: Must Have (Walking Skeleton)

### Problem

Sofia has tried to manually catalog her wardrobe in spreadsheets twice. Both times, she spent hours categorizing items and stopped before finishing. She finds it exhausting to type in every detail. She wants to "just take a photo" and have the app handle the rest.

### Who
- Fashion-conscious professional | Active digitization session | Motivated by the promise of first outfit after 5 items

### Solution

A camera-first item capture flow where a single photo produces: background-removed image, AI-guessed category, color, fabric, and occasion tags — pre-filled for review and one-tap confirmation. The user corrects; the AI learns. Each item should take under 60 seconds from photo to confirmed.

### Domain Examples

**1: Perfect capture (Sofia's camel coat)**
Sofia photographs her camel trench coat in good natural light, laid flat. Within 5 seconds: background removed, color detected as "Camel / Warm tan," category "Outerwear → Coat," season "Spring/Autumn + Winter," occasions "Work + Casual." She confirms with one tap. The item joins her wardrobe.

**2: Poor lighting — retake prompt (Sofia's black jeans)**
Sofia photographs her black slim jeans in a dim bedroom. The app detects low lighting and surfaces "This photo looks dark — retake?" She retakes near the window. Detection succeeds.

**3: AI category error — manual correction (Sofia's linen blazer)**
AI classifies Sofia's oversized linen blazer as "Tops → Blouse." Sofia corrects it to "Outerwear → Blazer." The item is saved with the corrected category. Correction is flagged to AI improvement pipeline.

### UAT Scenarios (see `acceptance-criteria.md` > AC-02-*)

- AC-02-01: Successful photo capture and AI classification
- AC-02-02: Low lighting detection and retake prompt
- AC-02-03: AI category error — manual correction
- AC-02-04: Upload failure due to network loss — local queue and retry
- AC-02-05: Gallery import instead of camera capture

### Acceptance Criteria

- [ ] Photo capture requires <= 1 tap after camera is open
- [ ] AI processing completes within 10 seconds for 95% of items
- [ ] AI-generated metadata is shown pre-filled and fully editable before confirmation
- [ ] Background-removed image is used in all wardrobe display contexts (not raw photo)
- [ ] item_record is written to wardrobe only after user taps "Add to wardrobe"
- [ ] item_count increments only for confirmed (active) items — not drafts
- [ ] Lighting quality below threshold: surface retake prompt before AI submission
- [ ] Network unavailable during upload: queue locally, retry on reconnect, no re-photograph required

### Technical Notes

- Nano Banana API for background removal and AI classification
- item_record.photo_url must point to CDN-hosted background-removed version
- Maximum photo file size before compression: 10MB; compress to < 2MB for upload
- EXIF data must be stripped before cloud storage (GDPR — no location metadata)
- AI confidence score determines whether to auto-suggest or surface manual picker
- GDPR Article 7 consent for photo storage must be obtained and logged before first upload (see requirements.md Section 4)
- Incidental face detection: photos are scanned at upload; if a human face is detected, user is prompted to crop or retake — upload does not proceed automatically with a detected face
- In-app photo guidance (flat lay or hanging) is shown on first capture and available from the help icon on the capture screen

### Dependencies

- Nano Banana API integration (CTO responsibility, Month 2 Phase 1)
- CDN for image storage (CTO infrastructure setup)
- item_record schema defined and deployed

---

## US-03: Progress-Driven Wardrobe Building to First Outfit

**Traces to**: JS-01 (Wardrobe Visibility), JS-04 (Daily Outfit Intelligence)
**MoSCoW**: Must Have (Walking Skeleton)

### Problem

Sofia's previous wardrobe apps showed her an empty grid with no reward for progress. There was no reason to keep going. She's found that she'll digitize the first 3 items enthusiastically and then lose momentum. The app needs to make reaching the first outfit feel achievable and imminent.

### Who
- First-time user mid-digitization | Has 1-4 items added | Motivation flagging without visible progress

### Solution

A progress indicator ("X of 5 items — add Y more to unlock your first outfit") that makes the session goal concrete and finite. At item 4, personalized encouragement by name. At item 5, a celebration transition and immediate outfit reveal. The journey from 0 to first outfit should take under 15 minutes.

### Domain Examples

**1: Sofia reaches item 5 in one session**
Sofia adds 5 items on Sunday evening. At item 4: "Sofia, we're learning your style." At item 5: celebration animation → instant outfit reveal. Total time: 12 minutes. She sets the outfit for Monday.

**2: Sofia pauses at item 3 and returns next day**
Sofia adds 3 items, closes app, returns Monday morning. Progress bar still shows 3/5. She adds 2 more before work and unlocks her outfit in the second session.

**3: Sofia's 5th item is in an occasion without matches (no work items yet)**
Sofia has 5 items: 3 casual tops, 1 casual skirt, 1 sneaker pair. Primary occasion is "Work." App surfaces a casual outfit instead and shows: "Add one work-appropriate item to get your first work outfit suggestion."

### UAT Scenarios (see `acceptance-criteria.md` > AC-03-*)

- AC-03-01: Progress indicator updates correctly after each item
- AC-03-02: 5th item triggers celebration and outfit reveal
- AC-03-03: Progress persists between sessions
- AC-03-04: Occasion mismatch at threshold — graceful message

### Acceptance Criteria

- [ ] Progress indicator visible on wardrobe grid and capture screens throughout first-time session
- [ ] item_count displayed accurately — excludes failed/draft items
- [ ] Personalized name appears in encouragement message at item 4
- [ ] Celebration animation plays exactly once: at first threshold crossing (not on every subsequent item)
- [ ] Transition from item 5 to first outfit occurs within 2 seconds
- [ ] Progress bar state persists across app restarts and sessions
- [ ] Occasion mismatch at threshold: fallback outfit with explanatory message (not an error)

### Technical Notes

- wardrobe.item_count is a real-time count of confirmed items; must be consistent with wardrobe grid item count
- Celebration animation: one-time flag per user — do not re-trigger on subsequent items
- Outfit generation triggered server-side when item_count crosses threshold; must handle concurrent submissions (e.g., user adds items rapidly)

### Dependencies

- US-02 (item_record must exist before item_count can increment)
- US-05 (outfit suggestion engine must be ready to receive trigger from item_count threshold)

---

## US-04: Occasion and Weather-Aware Outfit Suggestion

**Traces to**: JS-04 (Daily Outfit Intelligence)
**MoSCoW**: Must Have (MVP — Month 3)

### Problem

Sofia has received generic outfit suggestions from apps before. The problem is that "white shirt + blue jeans" is technically correct but tells her nothing about whether this outfit is appropriate for her client presentation at 14:00 in Milan in February. Without occasion and weather context, suggestions feel like random combinations, not curated styling.

### Who
- Regular PocketWardrobe user (1+ week) | Morning or evening outfit planning | Needs to dress for a specific context

### Solution

Daily outfit suggestions that explicitly account for: tomorrow's local weather (fetched automatically) and the user's primary occasion for the day (defaulting to style_profile.occasion_priorities, optionally overridable). The outfit card shows why the suggestion works — weather, occasion, color reasoning — in one sentence.

### Domain Examples

**1: Monday work meeting (Sofia, winter morning)**
Sofia opens the app Sunday evening. Milan tomorrow: 7°C, partly cloudy. Style profile: Classic, Work primary. Suggestion: camel wool coat + white turtleneck + dark slim trousers + ankle boots. Reasoning: "Structured and warm — perfect for a winter work day in Milan."

**2: Saturday casual brunch (Sofia, warmer weekend)**
Sofia changes occasion to "Casual" for Saturday. Milan: 14°C, sunny. Suggestion: light denim jacket + white linen shirt + straight-leg jeans + white sneakers. Reasoning: "A relaxed spring combination for a casual day out."

**3: Weather API down — graceful fallback (Sofia, any day)**
Weather API returns 503. App generates occasion-appropriate outfit without weather context. Card shows occasion label "Work" but no weather. Small text: "Weather info unavailable." Outfit is still presented confidently — this is a degraded, not broken, experience.

### UAT Scenarios (see `acceptance-criteria.md` > AC-04-*)

- AC-04-01: Work outfit with cold weather context
- AC-04-02: Casual outfit with mild weather context
- AC-04-03: User overrides occasion for today
- AC-04-04: Weather API failure — graceful fallback
- AC-04-05: Outfit avoids exact repetition from past 7 days

### Acceptance Criteria

- [ ] Daily outfit card shows weather context (temperature + condition icon)
- [ ] Daily outfit card shows occasion label (Work / Casual / Sport / Events)
- [ ] Outfit items are all sourced from user's confirmed wardrobe
- [ ] Occasion can be overridden by user for the day without changing style_profile
- [ ] Weather context reflects local weather for user's registered location
- [ ] If weather API is unavailable: outfit shown without weather context; no error state
- [ ] Rotation engine does not repeat exact item combination within 7 days
- [ ] Reasoning sentence shown under outfit (minimum 1 sentence, max 2)

### Technical Notes

- Weather API call cached per-day per-location; TTL expires at midnight local time
- Outfit engine must read outfit_history before generating — rotation constraint is a business rule
- Location stored as city-level, not GPS coordinates (privacy)
- "Today's occasion" override is ephemeral (resets daily); does not mutate style_profile

### Dependencies

- US-02 (items must exist in wardrobe with occasion_tags)
- US-01 (style_profile drives default occasion)
- Weather API integration (CTO responsibility)
- US-03 (outfit engine must be active and triggered)

---

## US-05: Item Swap Within Daily Outfit

**Traces to**: JS-04 (Daily Outfit Intelligence)
**MoSCoW**: Must Have (MVP — Month 3)

### Problem

Sofia receives a perfect work outfit suggestion but the suggested shoes are block heels — and she has back-to-back meetings that involve walking between offices. She wants to swap just the shoes without requesting an entirely new outfit, which would lose the combination she likes.

### Who
- Regular user | Has received a daily outfit suggestion | Wants agency over one element without starting over

### Solution

Tapping any item in the outfit visualization opens a bottom drawer showing wardrobe alternatives for that item category. The user picks a replacement and the outfit updates in place. The modified outfit can be saved as a wear event.

### Domain Examples

**1: Shoe swap for comfort (Sofia)**
Sofia taps the loafers in her Tuesday suggestion. The drawer shows her 4 footwear items. She selects ankle boots. The outfit visualization updates to show the ankle boots. She saves the modified outfit.

**2: Top swap for formality level (Sofia's colleague)**
The suggested white t-shirt feels too casual for a client meeting. User taps it, sees 6 tops available. Selects the structured silk blouse. Outfit updates. The original top is logged as "not selected for this occasion."

**3: No alternatives available for swapped category (Sofia)**
Sofia taps the coat to swap it. She only has 1 coat in her wardrobe. The drawer shows the one coat with a message: "You only have one coat — add more to your wardrobe for variety." The current coat remains selected.

### UAT Scenarios (see `acceptance-criteria.md` > AC-05-*)

- AC-05-01: Successful item swap
- AC-05-02: Only one item in category — informative empty state
- AC-05-03: Modified outfit saved as wear event

### Acceptance Criteria

- [ ] Any item in the outfit can be tapped to open a swap drawer
- [ ] Swap drawer shows all wardrobe items in the same category as the tapped item
- [ ] Swapping an item updates the outfit visualization in place (< 1 second)
- [ ] User can dismiss the swap drawer without making a change
- [ ] "Only one item in category" state: informative message + "Add more items" link
- [ ] Modified outfit (with swap applied) can be saved as a wear event
- [ ] Swap does not mutate the original outfit_suggestion record — creates a new accepted variant

### Technical Notes

- Swap drawer fetches items filtered by category from wardrobe in real time
- outfit_suggestion is immutable after creation; user acceptance creates a new wear_event with final_item_ids
- Swap state is ephemeral (session-only); if user leaves app and returns, original suggestion is shown

### Dependencies

- US-02 (items must be in wardrobe with category tags)
- US-04 (outfit suggestion must be rendered before swap is available)

---

## US-06: Daily Outfit Habit and Unworn Item Awareness

**Traces to**: JS-04 (Daily Outfit Intelligence), JS-01 (Wardrobe Visibility)
**MoSCoW**: Should Have (MVP — Month 3)

### Problem

Sofia loves the daily outfit card but after 3 weeks notices she's still defaulting to the same few items. She owns 35 items now but only sees suggestions featuring the same 12. She starts to wonder if the other 23 items are "in" her wardrobe at all. She also feels vaguely guilty about never wearing things she digitized.

### Who
- Established user (3+ weeks, 20+ items) | Opening app for daily outfit | Wardrobe growing but feeling stale

### Solution

The daily outfit card shows wardrobe stats (total items, worn vs unworn this month). A tappable "See what you haven't worn" link surfaces items with 0 wear events in the past 30 days, and each can be tapped to generate an outfit that features that specific item.

### Domain Examples

**1: Sofia discovers 14 unworn items after 3 weeks**
Daily card shows "Unworn this month: 14 items." Sofia taps it and sees a grid with her forgotten mustard-yellow blazer, a floral midi skirt, and some other rarely-worn items. She taps the blazer and gets an outfit suggestion built around it.

**2: All items worn this month (active user)**
User who adds outfits daily sees "Unworn this month: 0 items." No guilt, all items actively rotating. A positive reinforcement message: "Your wardrobe is working hard."

**3: New user (1 week, 8 items) — stat is irrelevant**
At 8 items, 30-day stats are meaningless. The unworn tracker does not appear until the user has >= 15 items AND has used the app for >= 7 days.

### UAT Scenarios (see `acceptance-criteria.md` > AC-06-*)

- AC-06-01: Unworn items stat visible after 7 days and 15+ items
- AC-06-02: Tapping unworn item generates outfit featuring that item
- AC-06-03: All items worn — positive reinforcement message

### Acceptance Criteria

- [ ] Wardrobe stats (total items, unworn count) shown on daily outfit card
- [ ] Unworn items tracker visible only for users with >= 15 items AND >= 7 days of use
- [ ] Unworn item grid shows items sorted by longest time since last worn
- [ ] Tapping an unworn item generates an outfit featuring that item as the focus piece
- [ ] "All items worn" state shows positive reinforcement message instead of stats
- [ ] wear_event must be explicitly accepted — viewing outfit does not mark item as "worn"

### Technical Notes

- wardrobe_stats is a derived calculation at query time; not stored
- worn_count per item: sum of wear_events where item appears in items_worn
- "Unworn" = worn_count = 0 in the past 30 days AND item was added more than 14 days ago (items added within 14 days are excluded to avoid false urgency for recently added items)
- Eligibility gate (15 items, 7 days) prevents premature stat display for new users

### Dependencies

- US-02 (items must have wear tracking)
- US-05 (wear_events must be created from outfit acceptance)
- US-04 (daily outfit card must exist as the host for stats display)

---

## Technical Task: TT-01 — Nano Banana API Integration Spike

**Type**: Spike (time-boxed research + integration)
**Links to**: US-02 (blocks item digitization)
**Duration**: 5 days (CTO)
**MoSCoW**: Must Have (prerequisite to walking skeleton)

### Learning Objectives

1. What is the P50/P95 latency for background removal on garment photos?
2. What image quality thresholds produce acceptable results?
3. What is the cost-per-image at 200 beta users, 1000 MAU, and 4445 MAU?
4. Does the API return classification confidence scores we can use for the "auto vs manual" branching logic?

### Exit Criteria

- Documented P50/P95 latency from 50 test photos
- Documented cost-per-image and cost projection for 3 scale levels
- Sample background-removed images rated by team (acceptable / needs correction)
- Decision: use Nano Banana for both background removal AND classification, or classification from a separate provider?

### Note for Product

This spike result directly informs the US-02 AC for "AI processing completes within 10 seconds for 95% of items." If P95 latency is >10 seconds, the AC must be revised before MVP.
