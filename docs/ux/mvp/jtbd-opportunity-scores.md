# JTBD Opportunity Scoring — PocketWardrobe MVP

## Scoring Method

```
Opportunity Score = Importance + max(0, Importance - Satisfaction)
```

- **Importance**: % of target users who rate this outcome as important (4-5 on 5-point scale)
- **Satisfaction**: % of users satisfied with current solution for this outcome (4-5 on 5-point scale)
- **Score range**: 0-20 (higher = greater opportunity)

**Data Source**: Team estimates based on business plan competitive analysis, described user frustrations, and analogous market research from Whering/Stylebook/Indyx positioning. Sample: 4 founders + competitive intelligence.

**Confidence Level**: MEDIUM (team estimates, not primary user research). Scores indicate relative priority direction, not absolute values. Re-score after beta with 10+ user interviews.

---

## Outcome Statements by Job Map Step

### JS-01: Wardrobe Visibility (Core Job)

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 01 | Minimize the time to add a new clothing item to my digital wardrobe | 92% | 10% | 17.6 | Extremely Underserved |
| 02 | Minimize the likelihood of an item being miscategorized after upload | 85% | 15% | 14.3 | Extremely Underserved |
| 03 | Maximize the completeness of wardrobe capture (no items left out) | 88% | 5% | 16.7 | Extremely Underserved |
| 04 | Minimize the time to find a specific item in my digital wardrobe | 80% | 20% | 13.6 | Underserved |
| 05 | Minimize the likelihood of accidentally duplicating an item entry | 70% | 30% | 11.0 | Appropriately Served |
| 06 | Maximize the accuracy of color and fabric recognition from photos | 90% | 5% | 17.5 | Extremely Underserved |
| 07 | Minimize the effort to maintain the wardrobe after initial digitization | 85% | 10% | 16.0 | Extremely Underserved |

### JS-04: Daily Outfit Intelligence

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 08 | Minimize the time to receive a complete outfit suggestion each morning | 82% | 8% | 15.6 | Extremely Underserved |
| 09 | Maximize the relevance of outfit suggestions to current weather | 78% | 20% | 13.2 | Underserved |
| 10 | Maximize the relevance of outfit suggestions to planned occasion | 85% | 10% | 16.0 | Extremely Underserved |
| 11 | Minimize the likelihood of receiving the same outfit suggestion repeatedly | 72% | 25% | 11.4 | Appropriately Served |
| 12 | Maximize the feeling that suggestions match personal style | 90% | 5% | 17.5 | Extremely Underserved |
| 13 | Minimize the number of steps to accept and "lock in" today's outfit | 75% | 15% | 12.5 | Underserved |

### JS-02: Gap Detection (Phase 3)

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 14 | Minimize the likelihood of buying an item that duplicates something owned | 80% | 20% | 13.6 | Underserved |
| 15 | Maximize the accuracy of identifying real wardrobe gaps | 75% | 10% | 13.0 | Underserved |
| 16 | Minimize the time to verify whether a potential purchase matches owned items | 85% | 5% | 16.5 | Extremely Underserved |

### JS-03: Resale (Phase 3)

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 17 | Minimize the time to create a professional listing image for an item | 75% | 5% | 14.3 | Extremely Underserved |
| 18 | Maximize the quality of AI-generated listing photos vs manual alternatives | 70% | 10% | 12.6 | Underserved |
| 19 | Minimize the effort to push a listing from PocketWardrobe to Vinted/Depop | 72% | 5% | 13.8 | Underserved |

---

## Ranked Opportunity Matrix (All Jobs)

| Rank | # | Outcome Statement | Score | Job | MVP Phase |
|------|---|-------------------|-------|-----|-----------|
| 1 | 01 | Minimize time to add a new clothing item | 17.6 | JS-01 | Walking Skeleton |
| 2 | 06 | Maximize accuracy of color/fabric recognition | 17.5 | JS-01 | Walking Skeleton |
| 3 | 12 | Maximize feeling suggestions match personal style | 17.5 | JS-04 | MVP |
| 4 | 03 | Maximize completeness of wardrobe capture | 16.7 | JS-01 | Walking Skeleton |
| 5 | 07 | Minimize effort to maintain wardrobe post-digitization | 16.0 | JS-01 | MVP |
| 6 | 10 | Maximize relevance to planned occasion | 16.0 | JS-04 | MVP |
| 7 | 16 | Minimize time to verify purchase against owned items | 16.5 | JS-02 | Phase 3 |
| 8 | 08 | Minimize time for morning outfit suggestion | 15.6 | JS-04 | MVP |
| 9 | 02 | Minimize likelihood of item miscategorization | 14.3 | JS-01 | Walking Skeleton |
| 10 | 17 | Minimize time to create professional listing image | 14.3 | JS-03 | Phase 3 |
| 11 | 04 | Minimize time to find a specific item | 13.6 | JS-01 | MVP |
| 12 | 14 | Minimize likelihood of buying duplicate item | 13.6 | JS-02 | Phase 3 |
| 13 | 09 | Maximize relevance to weather | 13.2 | JS-04 | MVP |
| 14 | 19 | Minimize effort to push listing to marketplace | 13.8 | JS-03 | Phase 3 |
| 15 | 15 | Maximize accuracy of gap identification | 13.0 | JS-02 | Phase 3 |
| 16 | 13 | Minimize steps to lock in today's outfit | 12.5 | JS-04 | MVP |
| 17 | 18 | Maximize quality of AI listing photos | 12.6 | JS-03 | Phase 3 |
| 18 | 11 | Minimize likelihood of repeated outfit suggestions | 11.4 | JS-04 | MVP |
| 19 | 05 | Minimize likelihood of duplicate item entries | 11.0 | JS-01 | MVP |

---

## Top Opportunities (Score >= 15) — Walking Skeleton and MVP

### Extremely Underserved (Score 15+)

1. **Minimize time to add item** (17.6) — Story: US-01 Wardrobe Item Digitization
2. **Maximize accuracy of AI recognition** (17.5) — Story: US-01 (AI metadata extraction)
3. **Maximize style match of suggestions** (17.5) — Story: US-04 Style Preference Onboarding
4. **Maximize completeness of capture** (16.7) — Story: US-02 Wardrobe Coverage Completeness
5. **Minimize effort to maintain wardrobe** (16.0) — Story: US-03 Quick Item Add (new purchases)
6. **Maximize relevance to occasion** (16.0) — Story: US-05 Occasion-Based Outfit Suggestion

### Investment Recommendation

These six outcomes define the non-negotiable core of the MVP. They map to 5 user stories. Any story that does not serve at least one of these outcomes is a deferral candidate.

---

## Appropriately Served Areas (Score 10-12) — Maintain or Defer

- Duplicate item prevention (11.0) — basic deduplication adequate; no investment needed
- Repeated suggestion avoidance (11.4) — rotation logic is low-effort; include but not lead feature

---

## MVP Scope Decision (Opportunity-Score-Driven)

### Walking Skeleton (Outcomes 1, 2, 4 — Month 2)
The absolute minimum to prove the core loop works:
1. Camera-based item digitization with AI metadata extraction
2. Wardrobe item listing and browsing
3. First outfit suggestion (static rules, limited personalization)

### MVP Must-Have (Outcomes 3, 5, 6 — Month 3)
1. Style preference onboarding (calibration)
2. Weather-aware outfit suggestions
3. Occasion-tagged outfit suggestions
4. Quick add for new purchases (maintenance)

### Phase 3 Investment (Outcomes 7-19 — Month 4+)
- Gap detection and smart shopping
- Resale listing generation
- Social closet and influencer feed
- Virtual Try-On (requires established user base and wardrobe data to validate quality)

---

## Critical Assumption Register

These assumptions underpin the scoring. If wrong, priorities shift.

| Assumption | Risk Level | Validation Method |
|------------|------------|-------------------|
| Digitization friction is the #1 adoption barrier | HIGH | Measure % of users who complete first 10 items in beta |
| AI recognition accuracy is sufficient for trust | HIGH | Measure correction rate in alpha; target <15% manual corrections |
| Users will return daily for outfit suggestions | HIGH | Measure D7 and D30 retention in closed beta |
| Style suggestions feel personalized with 3-question calibration | MEDIUM | Measure "suggestion accepted" rate in first week; target >40% |
| Free tier (3 try-ons/day) creates premium conversion pressure | MEDIUM | Measure try-on engagement and conversion in beta |
