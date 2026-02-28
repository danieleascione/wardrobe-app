# JTBD Four Forces Analysis — PocketWardrobe MVP

## How to Read This Document

For switching to happen, Push + Pull must exceed Anxiety + Habit.
The Four Forces analysis reveals where the product must focus to tip users from "that's interesting" to "I use this daily."

```
        SWITCHING HAPPENS (user adopts PocketWardrobe)
             ^
             |
Push of  ----+---- Pull of
Current       |     PocketWardrobe
Situation     |
             |
        NO SWITCHING (user stays with current behavior)
             ^
             |
Anxiety  ----+---- Habit of
of New        |     Current Approach
Solution      |
```

---

## JS-01: Wardrobe Visibility — "See and use what I own"

### Push (demand-generating — current frustrations driving change)

- **The Paradox**: Closet is full but "nothing to wear." Users experience genuine cognitive overload standing before 80+ garments and seeing nothing coherent.
- **Physical Access Tax**: Items at the back of the wardrobe, in drawers, or in storage are functionally invisible. Out of sight = never worn.
- **Duplicate Purchase Shame**: Buying a third navy blue blazer because the other two were forgotten. Discovering a still-tagged item bought years ago.
- **Decision Fatigue**: Spending 20-30 minutes getting dressed, arriving stressed. The mental energy cost is real and daily.
- **Occasion Panic**: Realizing at 8pm the night before a wedding that you own nothing appropriate — when in reality you do.

### Pull (demand-generating — attractiveness of PocketWardrobe)

- **The Pocket Wardrobe Promise**: Every item I own, accessible and searchable from my phone in 3 seconds.
- **Outfit Confidence**: Seeing a complete, validated outfit suggestion removes the "is this working?" uncertainty.
- **The Discovery Feeling**: Finding a combination in owned items you never thought of — the "I forgot I had this" joy.
- **Feeling Organized**: The aspirational identity of someone who has their wardrobe under control.
- **No More Duplicates**: "I can check my wardrobe from the store before buying."

### Anxiety (demand-reducing — fears about PocketWardrobe)

- **Photo Effort Tax**: "Photographing my entire wardrobe sounds like a weekend project." The prospect of digitizing 100+ items feels overwhelming before starting.
- **AI Accuracy Doubt**: "Will the app actually recognize fabric and color correctly, or will I spend time correcting it?"
- **Data Privacy**: "My body measurements and photos are sensitive. Where does this data go?"
- **Maintenance Burden**: "Once I digitize, I have to keep it updated every time I buy something. That's ongoing work."
- **App Abandonment Risk**: "I've downloaded organizing apps before and stopped using them after a week."

### Habit (demand-reducing — inertia of current approach)

- **The Physical Scan**: Users have a practiced routine of scanning their wardrobe visually. It "works enough" even if it's stressful.
- **Phone Camera + Pinterest**: Current combination: photo an outfit idea on Pinterest, pull the items manually. Familiar if clunky.
- **The Trusted 20%**: Most users rely on a reliable subset of their wardrobe. Changing this requires psychological safety.
- **Mental Catalog**: Heavy wearers maintain a mental map. They resist externalizing because it feels like admitting the mental map failed.

### Forces Assessment

| Force | Strength | Notes |
|-------|----------|-------|
| Push | HIGH | Daily frustration, emotional resonance, universal pain |
| Pull | HIGH | Promise is concrete and desirable |
| Anxiety | HIGH | Photo effort is the #1 adoption killer |
| Habit | MEDIUM | Current behavior is frustrating enough that habit isn't deeply entrenched |

**Switch Likelihood**: Medium-High

**Key Blocker**: Photo effort anxiety. If digitization takes >20 minutes for the first 10 items, most users quit.

**Key Enabler**: First-session "aha moment" — seeing their first curated outfit suggestion from their own clothes within 10 minutes of first use.

**Design Implication**: The MVP must make digitization feel effortless. Batch photo processing, smart suggestions after 5 items, immediate reward (first outfit suggestion) before the full wardrobe is cataloged. The onboarding is the product.

---

## JS-04: Daily Outfit Intelligence — "Discover outfits from what I own"

### Push (demand-generating — current frustrations driving change)

- **The Rotation Rut**: Most people wear the same 5-7 outfits cyclically, ignoring 70% of their wardrobe. They know it's happening and feel mildly guilty.
- **Context Mismatch**: Realizing mid-day they dressed wrong for the occasion (too formal, too casual, wrong for the weather).
- **Creativity Deficit**: Wanting to dress more interestingly but lacking the styling knowledge to combine items in non-obvious ways.
- **The "What Do I Wear Tomorrow" Spiral**: Spending mental energy the night before on an unresolved question.

### Pull (demand-generating — attractiveness of PocketWardrobe)

- **The Personal Stylist Fantasy**: Having something tell you "wear this today, it works perfectly" removes the decision entirely.
- **Weather-Smart Dressing**: Outfit suggestions that already account for rain forecast or 8°C morning — practical, not just aesthetic.
- **Wardrobe Discovery**: The delight of seeing a combination you never tried. "I didn't know I could wear these together."
- **Occasion Readiness**: "I have a client meeting tomorrow — what should I wear?" answered instantly.

### Anxiety (demand-reducing — fears about PocketWardrobe)

- **Style Taste Mismatch**: "Will the AI suggest outfits I'd actually like, or generic combinations?"
- **The Algorithm Black Box**: "How does it know what I consider appropriate for work vs casual?"
- **Dependency Fear**: "If I rely on this, will I lose my own sense of style?"
- **Frequency Fatigue**: "Will suggestions repeat? Will I see the same outfit suggested every Monday?"

### Habit (demand-reducing — inertia of current approach)

- **Pinterest / Instagram Inspiration**: Users already have a curation habit — scrolling for outfit ideas is a relaxing ritual.
- **Trusted Friends / Partners**: "I ask my partner if this looks good." Social validation is embedded in the routine.
- **The Reliable Uniform**: Professional uniforms or daily "default outfits" are cognitively comfortable. Disrupting them requires trust.

### Forces Assessment

| Force | Strength | Notes |
|-------|----------|-------|
| Push | MEDIUM | Real frustration but not acute pain — manageable |
| Pull | HIGH | The personal stylist vision is powerfully aspirational |
| Anxiety | MEDIUM | Style trust must be earned through good initial suggestions |
| Habit | MEDIUM | Current rituals are pleasurable, not just tolerated |

**Switch Likelihood**: Medium — requires demonstrated quality before habit forms

**Key Blocker**: The first 5 suggestions must feel right. If early suggestions miss, users dismiss the feature permanently.

**Key Enabler**: Onboarding style preference calibration (3 questions: style, occasions, color preferences) that makes first suggestions feel personalized, not generic.

**Design Implication**: Style calibration during onboarding is critical. The first outfit suggestion must feel like it "gets" the user. Show the reasoning: "Perfect for your Tuesday meeting, 12°C, matches your navy coat."

---

## JS-02: Intelligent Gap Detection — "Buy only what fills real gaps"

### Push
- Post-purchase regret is common and painful: "I already had 4 versions of this."
- Returns are friction-heavy; users often keep regretted items out of inertia.

### Pull
- Being told "you need X" by the app feels permission-giving and decisive.
- Affiliate link integration makes acting on the suggestion instant.

### Anxiety
- "Will it push me to buy things I don't need just to generate affiliate revenue?"
- Trust in recommendations is critical — feels like a conflict of interest.

### Habit
- Browsing and impulse buying is pleasurable. Being told "don't buy this" disrupts the shopping dopamine loop.

**Switch Likelihood**: Low-Medium without established trust from JS-01 and JS-04

**Design Implication**: This job only works once the user trusts the wardrobe database is complete and accurate. Defer to Phase 3.

---

## JS-03: Effortless Resale — "Sell unused clothes without the friction"

### Push
- Items accumulate guilt. "I should sell this but it's too much work" is a very real internal dialogue.
- Failed selling attempts (poor photos, no views) create learned helplessness.

### Pull
- Money from decluttering is motivating. Professional listing photos remove the "my photo looks terrible" shame.

### Anxiety
- "Will the AI-generated photo look fake or filtered? Will buyers feel deceived?"
- Marketplace account management is still required — the app only helps one part.

### Habit
- Selling requires initiating a new workflow. Existing habit is to donate (frictionless but no reward).

**Switch Likelihood**: Medium — strong pull, manageable anxiety, but requires trust in photo quality

**Design Implication**: The resale feature is a compelling premium monetization hook but requires a fully populated wardrobe. Deliver after wardrobe digitization is mature.

---

## MVP Force Prioritization Matrix

| Job | Push | Pull | Anxiety | Habit | Net Momentum | MVP Phase |
|-----|------|------|---------|-------|--------------|-----------|
| JS-01 Wardrobe Visibility | HIGH | HIGH | HIGH | MEDIUM | POSITIVE but fragile | Walking Skeleton |
| JS-04 Daily Outfit Intelligence | MEDIUM | HIGH | MEDIUM | MEDIUM | POSITIVE with calibration | MVP |
| JS-02 Gap Detection | HIGH | HIGH | HIGH | HIGH | NEUTRAL — trust required | Phase 3 |
| JS-03 Effortless Resale | MEDIUM | HIGH | MEDIUM | LOW | POSITIVE — premium hook | Phase 3 |

**The most important design investment for the MVP is reducing JS-01 anxiety (digitization effort) because it is the prerequisite for every other job.**
