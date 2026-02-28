# PocketWardrobe MVP — Requirements Document

**Version**: 1.0
**Date**: 2026-02-28
**Author**: Luna (Experience-Driven Requirements Analyst)
**Status**: Ready for DESIGN wave handoff

---

## 1. Business Context

PocketWardrobe addresses the "I have nothing to wear" paradox in an era of textile overabundance. The mission is to act as a digital image consultant — making the wardrobe visible, combinable, and daily-actionable.

**Core Hypothesis**: If users can see all their clothes in one place and receive daily intelligent outfit suggestions, they will stop buying redundant items and start using what they already own.

**Primary Value Proposition**: The only wardrobe management app where digitization takes minutes and the payoff (a styled outfit) arrives within the same session.

---

## 2. Target Users

### Primary Persona — Sofia Marchetti
- 28 years old, marketing professional based in Milan
- Owns 90+ garments, actively wears 15-20
- Fashion-conscious, environmentally aware, budget-aware
- Previous wardrobe apps: tried Stylebook and Whering, abandoned both within 2 weeks
- Abandonment reason: setup took too long, no immediate payoff
- Morning getting-dressed: stressful, takes 20-30 minutes, often dissatisfying
- Device: iPhone 14 Pro
- Fashion identity: classic minimalist, neutral palette, business-casual dominant

### Secondary Persona — Chiara Romano
- 24 years old, university student, Florence
- Owns 60 items, heavily uses second-hand (Vinted buyer)
- Motivations: sustainability, not rewearing the same outfit in social media posts
- Primary use case: outfit discovery and eventually resale (Phase 3)

### Out of Scope for MVP
- Business accounts / influencer accounts (Social Closet — Phase 3)
- Male users (initial iteration focused on women's fashion patterns)
- Users with fewer than 20 garments (insufficient wardrobe for outfit variety)

---

## 3. MVP Scope Recommendation

### The Core Hypothesis to Validate

Before building anything else, PocketWardrobe must validate:
1. Users will digitize at least 15 items in their first 3 sessions
2. Users return after Day 1 to check their daily outfit (D7 retention > 35%)
3. AI recognition accuracy is trusted (correction rate < 15%)

If these three metrics are not met, no amount of premium features will drive subscription revenue.

### Walking Skeleton (Month 2 — Founders Alpha)

The absolute minimum to prove the loop works:

| Feature | Why It's In | Success Metric |
|---------|-------------|----------------|
| Style calibration (3 questions) | Personalization without friction | >90% completion rate |
| Camera-based item digitization | Core job JS-01 | >80% of users add 5+ items in session 1 |
| AI metadata extraction (category, color, season, occasion) | Trust in the AI | <15% manual correction rate |
| Wardrobe grid with 5-item unlock | Progress motivation | >70% users reach 5 items |
| First outfit suggestion at 5 items | Immediate payoff — the "aha" moment | >60% accept first suggestion |

### MVP Must-Haves (Month 3 — Closed Beta, 200 users)

| Feature | Job | Why It's In |
|---------|-----|-------------|
| Weather-aware outfit suggestions | JS-04 | Without weather context, suggestions feel generic |
| Occasion-based outfit suggestions | JS-04 | Primary retention driver — daily relevance |
| Daily outfit card with morning check-in | JS-04 | Habit formation mechanism |
| Item swap within outfit | JS-04 | User agency — prevents feeling locked in by AI |
| Unworn items tracker | JS-01 | Seeds future engagement (resale, gap detection) |
| Quick item add (gallery, not just camera) | JS-01 | Reduces friction for ongoing maintenance |
| Basic search/filter in wardrobe | JS-01 | Necessary at 30+ items |

### Should-Have for Beta (Month 3, if time allows)

| Feature | Job | Priority |
|---------|-----|----------|
| Outfit history (no repetition) | JS-04 | Avoids "same outfit every Monday" frustration |
| Free tier limit (3 try-ons/day) | Monetization | Sets up premium conversion |
| Push notification (morning outfit) | JS-04 | Habit formation support |

### Deferred to Phase 3 (Month 4+)

| Feature | Reason for Deferral |
|---------|---------------------|
| Virtual Try-On (AI rendering on user body) | Technically highest risk. Requires established wardrobe data and significant compute. Validate wardrobe value first. |
| Resale listing generator | Requires populated wardrobe + trust established in AI quality |
| Smart Shopping / Gap Detection | Requires affiliate partnerships + wardrobe completeness (JS-02) |
| Social Closet & Influencer Feed | Requires creator acquisition strategy + significant additional scope |
| Premium subscription billing | Cannot monetize before value is demonstrated |

### The Critical Deferral: Virtual Try-On

Virtual Try-On is the most technically risky feature. Nano Banana API integration requires:
1. User body profile (height, weight, body type) — privacy-sensitive
2. High-quality garment photos (background removed, multiple angles)
3. Photorealistic rendering pipeline validation

**Recommendation**: Do not include Virtual Try-On in the walking skeleton or MVP. Include in Phase 3 after:
- Wardrobe quality is proven (average correction rate <15%)
- User trust is established (D30 retention >25%)
- Wardrobe photo quality is sufficient for rendering (>500 items in beta corpus)

---

## 4. Non-Functional Requirements

### Performance
- Outfit suggestion generation: < 3 seconds measured from the moment the loading state is visible on screen (after user tap or daily app open) to the first rendered outfit card frame appearing
- AI item processing (photo submission to results): < 10 seconds for 95% of items
- App cold start: < 2 seconds
- Wardrobe grid (up to 200 items): renders in < 1.5 seconds

### Reliability
- Core wardrobe and outfit features: 99.5% uptime
- Graceful degradation if weather API is unavailable (outfit without weather context, not a failure)
- Offline: wardrobe browsing available offline; photo capture queues for upload on reconnect

### Security & Privacy (GDPR / EU Compliance)
- All garment photos stored in EU-region cloud storage
- User body data (if collected for try-on in Phase 3): explicit consent, right to deletion
- Photo metadata (EXIF) stripped on upload — no location data retained
- User can delete their account and all data within 30 seconds (GDPR Article 17)
- Analytics data: aggregated and anonymized before any external use
- GDPR Article 7 photo consent: explicit consent for garment photo storage must be obtained before first upload, logged server-side with timestamp and version, and revocable at any time from Settings > Privacy
- Photo capture guidance: in-app instructions show flat-lay or hanging capture methods to minimize incidental personal data (room contents, reflections, people)
- Incidental face detection: photos are scanned at upload; if a human face is detected in the photo, a prompt surfaces: "This photo may include a person — crop or retake before uploading?"
- AI quality monitoring: AI item classification correction rate is tracked per garment category. If any category exceeds 25% manual correction rate in beta, the engineering team is alerted to review training data for that category. This is surfaced as an operational dashboard metric (CTO-owned).

### Image Storage (Cost and Scale)
- Garment images stored at two tiers: high-resolution original (for rendering pipeline and future Try-On) and compressed thumbnail (for grid display and outfit cards)
- Thumbnail maximum size: 200KB; generated server-side on upload
- High-resolution original retained in cold storage tier; thumbnail served from CDN
- CTO to produce storage cost projection at 4,445 MAU (est. 50 items/user avg = 222,250 photos) for inclusion in financial plan before Phase 3

### Accessibility
- Minimum contrast ratio 4.5:1 for all text
- All interactive elements have accessibility labels for VoiceOver
- Outfit suggestion card is accessible without color as the sole differentiator

### Scalability
- Architecture must support 4,445 MAU at break-even without architectural change
- Serverless compute scales automatically with AI processing volume
- CDN delivery for all garment images

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| BR-01 | First outfit suggestion is unlocked only when wardrobe.item_count >= 5 |
| BR-02 | Free tier allows 3 virtual try-ons per day (enforced in Phase 3 when Try-On is live) |
| BR-03 | An outfit must contain at least 3 items to be presented as a suggestion |
| BR-04 | Outfit rotation engine must not repeat the same exact item combination within a 7-day window when wardrobe has >= 15 items. For wardrobes with < 15 items, the non-repeat window is 3 days. |
| BR-05 | wear_event is only created when user explicitly accepts an outfit — not on view |
| BR-06 | item_record.photo_url must always reference the background-removed version |
| BR-07 | Weather context cache is per-day per-location; must refresh after midnight local time |
| BR-08 | User can delete any item; outfit_suggestions referencing deleted items must be invalidated |
| BR-09 | Style profile defaults to classic/work/neutral if onboarding is skipped |
| BR-10 | AI correction rate per user is tracked; high correction rate users receive a "help us improve" prompt |

---

## 6. Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| AI recognition accuracy below user trust threshold | HIGH | CRITICAL | Alpha test with founders' wardrobes (>200 items) before beta; establish correction rate baseline |
| Nano Banana API latency exceeds 10s at scale | MEDIUM | HIGH | Implement async processing with push notification fallback; measure P95 latency in alpha |
| Background removal quality inconsistent (complex patterns, transparent garments) | HIGH | MEDIUM | Curate failure gallery during alpha; add manual crop/cleanup tool as fallback |
| Weather API reliability / cost at scale | LOW | LOW | Cache aggressively, fallback gracefully; evaluate multiple providers |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Digitization friction kills onboarding (users quit before 5 items) | HIGH | CRITICAL | This is the #1 risk. Measure funnel step-by-step in alpha. 5-item threshold must be achieved in <15 minutes |
| D7 retention below 35% (users do not return for daily outfit) | HIGH | HIGH | Push notification strategy critical; morning outfit card must be compelling |
| AI outfit suggestions miss user's taste | MEDIUM | HIGH | 3-question style calibration may be insufficient; plan A/B test of 3 vs 7 questions in beta |
| GDPR compliance for EU launch | LOW | CRITICAL | CTO accountable; legal review of biometric data handling before any try-on feature |

### Project Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Scope creep toward try-on during MVP | HIGH | MEDIUM | This document establishes Try-On as Phase 3; enforce at sprint planning |
| Team of 4 velocity insufficient for Month 2-3 timeline | MEDIUM | HIGH | Walking skeleton scoped minimally; defer anything not in the 5-story MVP set |
| Affiliate partnerships not ready for Phase 3 | MEDIUM | MEDIUM | CEO accountable; must be signed before gap-detection feature enters roadmap |

---

## 7. Assumptions Register

| Assumption | Owner | Validation Timing |
|------------|-------|------------------|
| A-01: Users will photograph items using in-app camera OR gallery import (not manual data entry) | Product | Alpha session observation |
| A-02: 5 items is the minimum threshold to generate a meaningful first outfit | Product | Alpha A/B test (3 vs 5 vs 10 items) |
| A-03: Style calibration (3 questions) produces sufficiently personalized suggestions | AI/Product | Beta suggestion acceptance rate |
| A-04: Nano Banana API produces background removal quality acceptable to users | CTO | Alpha photo review session |
| A-05: Users will primarily add clothes via individual photo sessions, not batch uploads | Product | Alpha session observation |
| A-06: Weather integration is the primary "intelligence" signal for occasion-appropriate outfits | Product | Beta feedback |

---

## 8. Ubiquitous Language

| Term | Definition | Do Not Confuse With |
|------|-----------|---------------------|
| Item | A single garment owned by the user | Product (catalog item from retailer) |
| Wardrobe | User's complete collection of owned items in the app | Physical wardrobe / closet |
| Outfit | A complete combination of 3+ items suggested by the AI | Look (aspirational, from external source) |
| Digitization | The act of photographing and cataloging an item into the wardrobe | Scanning (implies barcode/QR) |
| Occasion | Context label for when an outfit is appropriate (work, casual, sport, events) | Category (of garment) |
| Suggestion | An AI-curated outfit derived from owned items | Recommendation (of items to buy) |
| Wear event | A recorded instance of the user accepting and wearing an outfit | View (looking at outfit without accepting) |
| Gap | A missing item type that prevents coherent outfit completion | Wish list (user aspiration) |
| Try-On | AI rendering of an outfit on the user's body profile | Preview (seeing the outfit as flat lay) |
| Listing | A resale entry exported to Vinted/Depop | Product listing (retailer catalog) |
