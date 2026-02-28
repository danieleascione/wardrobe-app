# Journey: Wardrobe Digitization → Outfit Suggestion
## Visual Map with Emotional Annotations

**Persona**: Sofia Marchetti, 28, marketing professional, Milan. Owns 90+ garments, wears 20% of them regularly. Has tried Stylebook and Whering — abandoned both because setup took too long. Fashion-conscious, value environmentally aware, budget-aware.

**Trigger**: Sunday evening, preparing for the week. Dreads Monday morning outfit decisions. Downloads PocketWardrobe after seeing it recommended in a sustainable fashion newsletter.

**Job mapped**: JS-01 (Wardrobe Visibility) → JS-04 (Daily Outfit Intelligence)

---

## Emotional Arc Overview

```
Emotional State:

EXCITED ─────────────────────────────────────────────────────────────▶
                                                                   CONFIDENT
                        ▲ peak delight                             ▲
                       /  "first outfit"                          /
CURIOUS ─────────────/─────────────────────────────────────────  /
          "let's try"         ┌─────────────────┐               /
                              │ tension zone     │              /
ANXIOUS ─────────────────────▶│ "this will take │─────────────/
    "setup fear"              │  forever"        │
                              └─────────────────┘
                Step 1   Step 2    Step 3   Step 4   Step 5   Step 6

EMOTIONAL STATES:
  Step 1: Onboarding     → Curious + Hopeful
  Step 2: First photo    → Slightly anxious (effort fear)
  Step 3: AI processing  → Tense then relieved
  Step 4: Item review    → Engaged (first ownership)
  Step 5: First outfit   → Delighted (the "aha" moment)
  Step 6: Daily use      → Confident + Habitual
```

---

## Step-by-Step Journey

### Step 1: First Launch & Style Onboarding
**Sofia's moment**: Opens the app for the first time. Monday morning anxiety is her primary motivation.

```
+── STEP 1: Welcome & Style Calibration ────────────────────────────+
|                                                                     |
|  [PocketWardrobe]                                                   |
|                                                                     |
|  "Let's build your style profile"                                   |
|  3 quick questions, then we find your first outfit.                 |
|                                                                     |
|  1/3  Which best describes your style?                              |
|       ○ Minimalist  ○ Classic  ○ Bold  ○ Relaxed                   |
|                                                                     |
|  2/3  Which occasions matter most?                                   |
|       ☑ Work        ☑ Casual  ○ Sport  ○ Events                   |
|                                                                     |
|  3/3  Which colors do you gravitate toward?                         |
|       [Neutral palette]  [Earthy]  [Monochrome]  [Vibrant]         |
|                                                                     |
|                        [→ Start adding clothes]                     |
+─────────────────────────────────────────────────────────────────────+
```

**Emotional state**: Curious → Engaged. Onboarding feels light — 3 questions, not a survey.
**Key design decision**: Promise of "then we find your first outfit" sets a reward expectation. Users are oriented toward the reward, not the work.
**Shared artifacts produced**: `style_profile` (style archetype, occasion preferences, color palette)

---

### Step 2: First Item Digitization
**Sofia's moment**: Picks up the first item — a camel trench coat she loves. Photographs it.

```
+── STEP 2: Photograph Your First Item ─────────────────────────────+
|                                                                     |
|  [Camera viewfinder — full screen]                                  |
|                                                                     |
|         ┌──────────────────────────┐                               |
|         │                          │                               |
|         │     [garment centered]   │                               |
|         │                          │                               |
|         └──────────────────────────┘                               |
|                                                                     |
|  TIP: Lay flat or hang — we'll remove the background automatically  |
|                                                                     |
|       [Flash off]   [ Capture ]   [From gallery]                   |
|                                                                     |
|  Progress: 0 items digitized — add 5 to unlock your first outfit   |
+─────────────────────────────────────────────────────────────────────+
```

**Emotional state**: Mildly anxious ("is this going to be tedious?") → Curious. The progress bar "add 5 to unlock your first outfit" makes the effort feel finite and purposeful.
**Key design decision**: Specific threshold (5 items) gives the session a concrete endpoint. Sofia isn't digitizing her whole wardrobe — she's unlocking a feature.
**Error path**: Poor lighting → "This photo looks a bit dark. Retake for better results? [Retake] [Use anyway]"

---

### Step 3: AI Processing & Metadata Extraction
**Sofia's moment**: Taps capture. Watches AI work.

```
+── STEP 3: AI Recognition ─────────────────────────────────────────+
|                                                                     |
|  [Background removed image of camel trench coat]                    |
|                                                                     |
|  ✓ Background removed                                               |
|  ✓ Color detected: Camel / Warm tan                                 |
|  ✓ Category: Outerwear → Coat                                       |
|  ✓ Fabric estimated: Wool blend                                     |
|                                                                     |
|  We've pre-filled the details. Anything to adjust?                  |
|                                                                     |
|  Season:  ○ All    ○ Spring/Autumn  ● Winter   ○ Summer            |
|  Occasion: ☑ Work   ☑ Casual   ○ Sport   ○ Events                 |
|                                                                     |
|  Name (optional): "Camel Wool Coat"                      [edit]    |
|                                                                     |
|                    [← Retake]        [Add to wardrobe →]           |
+─────────────────────────────────────────────────────────────────────+
```

**Emotional state**: Tense (waiting) → Relieved then Impressed. The checklist animation ("✓ Background removed... ✓ Color detected") provides visible progress and builds trust.
**Key design decision**: Show the AI working step by step, not just a spinner. Each checkmark is a trust moment.
**Error path (recognition failure)**: "We couldn't identify this item automatically. What is it?" → manual category selection with subcategories.
**Shared artifacts produced**: `item_record` (photo_url, category, color, fabric, season, occasion_tags, name)

---

### Step 4: Wardrobe Growing (Items 2-5)
**Sofia's moment**: Adds 4 more items. The experience should feel faster each time.

```
+── STEP 4: Wardrobe Building ──────────────────────────────────────+
|                                                                     |
|  [Wardrobe grid view — 4 items visible, 1 slot remaining]           |
|                                                                     |
|  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   |
|  │[coat]│ │[top] │ │[jean]│ │[shoe]│ │  +   │                   |
|  │      │ │      │ │      │ │      │ │  Add │                   |
|  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                   |
|                                                                     |
|  ████████████████████░░░░  4/5 items — almost there!              |
|                                                                     |
|  Sofia, we're learning your style as you add more items.            |
|  Add your 5th item to see your first outfit suggestion.             |
|                                                                     |
|               [+ Add another item]                                  |
+─────────────────────────────────────────────────────────────────────+
```

**Emotional state**: Engaged → Building momentum. Each item added feels like progress, not work. The progress bar is the primary UX driver.
**Key design decision**: Name personalization ("Sofia, we're learning...") at item 4 makes the experience feel alive and responsive.
**Shared artifacts**: `wardrobe` (collection of item_records), `style_profile` updated with inferred patterns

---

### Step 5: First Outfit Suggestion — The "Aha Moment"
**Sofia's moment**: Adds the 5th item. The app transitions to the first outfit. This is the peak emotional moment of the entire MVP.

```
+── STEP 5: Your First Outfit ──────────────────────────────────────+
|                                                                     |
|  [Full-screen outfit visualization]                                 |
|                                                                     |
|  ┌─────────────────────────────────────────────────────┐          |
|  │                                                       │          |
|  │         [Camel coat over white silk top]              │          |
|  │           [Dark slim jeans + ankle boots]             │          |
|  │                                                       │          |
|  └─────────────────────────────────────────────────────┘          |
|                                                                     |
|  Monday's Outfit                                                     |
|  Perfect for: Work ☀ Milan, 9°C tomorrow morning                  |
|                                                                     |
|  Why this works:                                                     |
|  "Camel and white is a classic pairing. The structured coat         |
|   keeps it professional for your work occasions."                   |
|                                                                     |
|  [← Try another]    [Save this outfit ✓]    [Share →]              |
|                                                                     |
|  + Add more clothes to unlock more variety                          |
+─────────────────────────────────────────────────────────────────────+
```

**Emotional state**: DELIGHT. This is the moment that validates the entire adoption decision. Sofia sees her actual clothes combined intelligently. The "why this works" explanation builds trust in the AI.
**Key design decision**: Show the outfit reasoning. Don't just show what to wear — explain why it works. This is the "image consultant" moment from the mission statement.
**Shared artifacts**: `outfit_suggestion` (item_ids, occasion, weather_context, reasoning, date)

---

### Step 6: Daily Return Loop
**Sofia's moment**: Next morning. Opens app to see today's suggestion.

```
+── STEP 6: Daily Outfit Card ──────────────────────────────────────+
|                                                                     |
|  Good morning, Sofia.                                               |
|  Milan today: 7°C, partly cloudy                                    |
|                                                                     |
|  ┌─────────────────────────────────────────────────────┐          |
|  │                                                       │          |
|  │         [Tuesday's Outfit — different combination]   │          |
|  │                                                       │          |
|  └─────────────────────────────────────────────────────┘          |
|                                                                     |
|  For: Work   Wearing this week: 2 outfits so far                    |
|                                                                     |
|  [← Swap an item]   [This works for me ✓]   [Try on →]            |
|                                                                     |
|  Your wardrobe: 23 items    Unworn this month: 14 items            |
|                             [See what you haven't worn →]          |
+─────────────────────────────────────────────────────────────────────+
```

**Emotional state**: Confident + Habitual. The daily card becomes a ritual. The "unworn items" counter plants the seed for wardrobe expansion and eventually for JS-02/JS-03 engagement.
**Key design decision**: "Unworn this month: 14 items" is a gentle hook toward eventual resale and gap-detection features without being intrusive.
**Shared artifacts**: `daily_outfit` (date, outfit_id, weather_data, occasion), `wardrobe_stats` (total_items, worn_this_month, unworn)

---

## Error Path Map

| Step | Error | User Impact | Recovery |
|------|-------|-------------|---------|
| 2 | Photo too dark or blurry | Item unrecognizable | "Looks a bit dark — [Retake] or [Use anyway]" |
| 3 | AI fails to classify category | Wrong category assigned | Manual category picker with search |
| 3 | Background not fully removed | Messy item photo | "Clean it up" with simple crop tool |
| 5 | Fewer than 5 items with matching occasion | No work outfit possible | "Add one more work item to see an outfit for this occasion" |
| 5 | Weather API unavailable | Outfit lacks weather context | Suggest outfit without weather context, note "weather unavailable" |
| 6 | All owned items shown recently | Repetition risk | "You've worn most of your wardrobe recently — add new items or see all combinations" |

---

## Integration Points

| From | Produces | Used By |
|------|----------|---------|
| Style onboarding | style_profile | Outfit suggestion engine |
| Item digitization | item_record | Wardrobe grid, outfit engine, stats |
| Weather API | weather_context | Outfit suggestion card |
| Outfit acceptance | outfit_history | "Worn this month" stats, rotation engine |
| Daily card view | wear_event | Wardrobe usage analytics |
