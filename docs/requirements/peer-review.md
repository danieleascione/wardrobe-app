# Peer Review — PocketWardrobe MVP Requirements Package

```yaml
review_id: "req_rev_20260228_001"
reviewer: "product-owner (review mode)"
artifacts:
  - docs/requirements/requirements.md
  - docs/requirements/user-stories.md
  - docs/requirements/acceptance-criteria.md
  - docs/requirements/dor-checklist.md
  - docs/ux/mvp/jtbd-job-stories.md
  - docs/ux/mvp/jtbd-four-forces.md
  - docs/ux/mvp/jtbd-opportunity-scores.md
  - docs/ux/mvp/journey-wardrobe-digitization-visual.md
  - docs/ux/mvp/journey-wardrobe-digitization.yaml
  - docs/ux/mvp/journey-wardrobe-digitization.feature
  - docs/ux/mvp/shared-artifacts-registry.md
iteration: 1

strengths:
  - "Strong JTBD foundation: all four jobs clearly differentiated with functional/emotional/social dimensions. Forces analysis is honest about adoption blockers."
  - "The 5-item unlock mechanic is a concrete, time-bound first session goal — reduces the open-ended setup dread that caused competitor app abandonment."
  - "Shared artifacts registry is thorough: every ${variable} in journey mockups has documented source of truth, consumer list, and integration risk."
  - "Real persona data throughout: Sofia Marchetti appears with consistent characteristics across all 10 artifacts — no generic user123 anti-pattern."
  - "MVP scope recommendation is disciplined: Virtual Try-On explicitly deferred with reasoning tied to risk and prerequisite data quality."
  - "Opportunity scoring is honest about confidence level: clearly labeled as team estimates, not user research, with re-scoring instruction after beta."
  - "DoR validated with evidence per item, not just checkbox marks — reviewable by anyone."

issues_identified:
  confirmation_bias:
    - issue: "Happy path bias in AC-02: all 5 scenarios are user-triggered. Missing AI pipeline failure that is transparent to the user (silent misclassification with high confidence)."
      severity: "high"
      location: "US-02, AC-02-01"
      recommendation: "Add scenario: AI returns high-confidence but incorrect result and user does not notice in review. Detect via: correction rate tracking. Require: low-confidence auto-flag even when score is above threshold. Add AC: 'items with correction rate > 20% in beta trigger a re-review notification.'"

    - issue: "Availability bias in persona: only Italian urban professionals considered. European fashion market includes significant non-Milan audiences. The business plan targets break-even at 4,445 MAU — this requires geographic breadth beyond Milan."
      severity: "medium"
      location: "requirements.md > Section 2, user-stories.md > all stories"
      recommendation: "Add a brief note that personas are illustrative of the primary segment, not an exclusion of other profiles. Validate at beta: what % of users are outside major Italian metros?"

    - issue: "Technology assumption in requirements.md Section 3 (Virtual Try-On deferral): deferral rationale cites 'Nano Banana API' without noting that Virtual Try-On may require a different technical approach than background removal. These are separate capabilities."
      severity: "low"
      location: "requirements.md > Section 3 (Virtual Try-On deferral)"
      recommendation: "Clarify in technical notes for Phase 3 planning: background removal and virtual body rendering are separate technical capabilities. Do not assume Nano Banana handles both."

  completeness_gaps:
    - issue: "Missing stakeholder perspective: operations/support team. When AI classification is consistently wrong for a specific garment type (e.g., knitwear), who detects it and how? No support escalation path documented."
      severity: "high"
      location: "requirements.md — no operations section"
      recommendation: "Add operational requirement: AI correction rate is monitored per garment category. Alert threshold: if any category correction rate exceeds 25% in beta, engineering reviews that category's training data. This is critical for maintaining user trust (a core vulnerability identified in forces analysis)."

    - issue: "Missing GDPR Article 7 consent requirement: the app collects photos of garments which may incidentally contain personal data (rooms visible, reflections, people in background). No consent mechanism or photo guidelines documented."
      severity: "critical"
      location: "requirements.md > Section 4 (Security & Privacy)"
      recommendation: "Add requirement: Photo capture guidance instructs users to photograph items flat or hanging (avoids incidental people/room capture). Add: photos are inspected at upload for incidental face detection; if detected, surface a prompt. Add: GDPR Article 7 consent for photo storage must be explicit, logged, and revocable."

    - issue: "Missing error scenario for outfit engine failure: what happens if the outfit suggestion engine returns no valid outfit (e.g., wardrobe has 15 items but all are summer-only and it is winter, and weather-based filtering leaves nothing)?"
      severity: "high"
      location: "US-04, acceptance-criteria.md"
      recommendation: "Add AC-04-06: 'When seasonal and weather filters eliminate all wardrobe items from consideration, the app shows the best seasonal alternative with explanation: your wardrobe is optimized for summer — here is the best option for today, and a prompt to add winter items.'"

    - issue: "Missing NFR for image storage cost at scale. At 4,445 MAU with an average 50 items each = 222,250 garment photos. No storage cost projection or compression/tiering requirement is specified."
      severity: "high"
      location: "requirements.md > Section 4 NFRs"
      recommendation: "Add NFR: garment images are stored at two tiers — high-resolution original (for rendering) and compressed thumbnail (for grid display). Thumbnail max size: 200KB. CTO to project storage cost at 4,445 MAU for financial plan."

  clarity_issues:
    - issue: "Vague performance requirement for AI outfit engine: 'outfit suggestion generation < 3 seconds' does not specify what the clock starts at. From user tap? From item_count threshold crossing? From daily app open?"
      severity: "high"
      location: "requirements.md > Section 4 Performance NFRs"
      recommendation: "Clarify: '< 3 seconds measured from the moment the user sees the loading state (after tap or app open) to the first rendered outfit card frame being visible on screen.'"

    - issue: "Business Rule BR-04 (no repeat in 7-day window) conflicts with a small wardrobe: a user with 5 items has very few combination permutations. A 7-day no-repeat rule may be impossible to satisfy, yet no exception case is documented."
      severity: "high"
      location: "requirements.md > BR-04, US-04"
      recommendation: "Revise BR-04: 'Rotation engine avoids repeating exact item combinations within a 7-day window when the wardrobe has >= 15 items. For wardrobes < 15 items, the window is reduced to 3 days.' Add AC-04 scenario for small wardrobe repetition handling."

    - issue: "Ambiguity in US-06 AC: 'worn_count = 0 in the past 30 days' — does this include items added within the past 30 days that have never been suggested? A newly added item with 0 wear events is not 'unworn by neglect.'"
      severity: "medium"
      location: "US-06, AC-06-01"
      recommendation: "Revise definition: 'Unworn item = worn_count = 0 AND item was added more than 14 days ago.' Items added within 14 days are excluded from the unworn tracker to avoid false urgency for new items."

  testability_concerns:
    - issue: "AC bullet 'Completion rate target: >90% (skip rate <10%)' in US-01 is a business metric, not a testable acceptance criterion for the story. It cannot be automated as a unit test; it is a beta analytics goal."
      severity: "high"
      location: "US-01 Acceptance Criteria bullets"
      recommendation: "Move the 90% completion rate target to the requirements.md metrics section or the JTBD opportunity scores file. Replace in AC with: 'The calibration screen provides a clearly visible dismiss option on every question' — observable and automatable."

    - issue: "The 'reasoning sentence' in US-04 AC ('approximately reads...') is non-testable. Automated tests cannot validate approximate prose content."
      severity: "high"
      location: "AC-04-01"
      recommendation: "Replace 'reads approximately' with a testable structural criterion: 'The outfit card includes a reasoning field of 1-2 sentences that references at least one of: weather condition, temperature, occasion label, or color relationship of items.'"

  priority_validation:
    q1_largest_bottleneck: "YES — digitization friction identified as primary adoption blocker via forces analysis; opportunity scoring confirms it as top cluster (scores 16-17)"
    q2_simple_alternatives: "ADEQUATE — competitor apps analyzed (Whering, Stylebook, Indyx); Virtual Try-On deferral argued against including it; 5-item threshold versus 3 vs 10 noted as A/B test candidate"
    q3_constraint_prioritization: "CORRECT — GDPR constraint documented as CTO-owned without over-engineering the entire architecture around it; monetization correctly deferred until value demonstrated"
    q4_data_justified: "JUSTIFIED for direction; MARKED AS TEAM ESTIMATES honestly — re-scoring after beta is correctly specified"
    verdict: "PASS"

critical_issues_count: 1
high_issues_count: 7
medium_issues_count: 2
low_issues_count: 1

approval_status: "conditionally_approved"
approval_condition: |
  The 1 critical issue (GDPR photo consent) must be resolved before DESIGN wave handoff.
  The 7 high issues should be resolved in the same pass — most are single-sentence AC additions or clarifications.
  Medium and low issues can be resolved in the DESIGN wave or noted as backlog items.

required_actions_before_handoff:
  critical:
    - "Add GDPR Article 7 photo consent requirement to requirements.md Section 4"
    - "Add incidental face detection guidance to US-02 technical notes"

  high:
    - "Add AC-02-06: silent AI misclassification (high confidence wrong result)"
    - "Add operations requirement: AI correction rate monitoring by category"
    - "Add AC-04-06: seasonal filter eliminates all items — graceful fallback"
    - "Add storage tiering NFR (high-res + thumbnail) to requirements.md Section 4"
    - "Clarify performance NFR clock start definition (requirements.md Section 4)"
    - "Revise BR-04 for small wardrobe exception (< 15 items, 3-day window)"
    - "Replace 90% completion rate AC bullet with observable criterion"
    - "Replace 'reads approximately' in AC-04-01 with structural reasoning field criterion"
```

---

## Resolution Actions Taken (Iteration 1)

The following issues were resolved by updating the requirements package after review:

### Critical — Resolved

**GDPR Article 7 Photo Consent**: Added to `requirements.md` Section 4 as explicit requirement covering consent logging, photo capture guidance (flat/hanging), incidental face detection prompt, and revocability. Added to US-02 technical notes.

### High — Resolved

**AC-02-06 Silent Misclassification**: Added scenario — see `acceptance-criteria.md` AC-02-06 below.

**Operations requirement**: Added AI quality monitoring section to `requirements.md` Section 4.

**AC-04-06 Seasonal filter failure**: Added scenario — see `acceptance-criteria.md` AC-04-06 below.

**Storage tiering NFR**: Added high-res + thumbnail tiering requirement to `requirements.md` Section 4.

**Performance NFR clock start**: Clarified to "from loading state visible to first rendered outfit card frame."

**BR-04 small wardrobe exception**: Revised in `requirements.md` BR-04.

**Completion rate AC replacement**: Replaced metric target with observable dismissal criterion in US-01 AC.

**Reasoning field criterion**: Replaced "reads approximately" with structural field criterion in AC-04-01.

**US-06 unworn definition**: Revised to exclude items added within 14 days.

---

## Post-Resolution Status

After applying all critical and high resolutions:

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 1 | Resolved |
| High | 7 | Resolved |
| Medium | 2 | Noted for DESIGN wave |
| Low | 1 | Noted, no action required |

**Revised approval status: APPROVED for DESIGN wave handoff.**
