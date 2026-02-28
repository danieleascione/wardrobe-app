# JTBD Job Stories — PocketWardrobe MVP

## Classification: Greenfield Consumer Mobile App

**Workflow**: discover → discuss → design → distill → baseline → roadmap → split → execute → review

PocketWardrobe targets fashion-conscious consumers. Evidence base: business plan competitive analysis, positioning statements, and described frustrations. This document synthesizes jobs-to-be-done from that evidence using the JTBD job story format (When/I want to/So I can) across three job dimensions.

---

## Identified Jobs (4 Primary Jobs)

### Job 1: The Invisible Wardrobe Problem

**Core Job Statement**: "Help me see and use what I already own before I spend or waste more."

**Job Story JS-01: Wardrobe Visibility**

```
When I'm standing in front of my full wardrobe feeling like I have nothing to wear,
I want to see all my clothes organized and combinable in one place,
so I can make a confident outfit decision in under 2 minutes instead of spiraling.
```

#### Functional Job
Catalog, access, and combine all owned clothing items from a single digital interface — removing the need to physically handle every garment.

#### Emotional Job
Feel in control and capable when getting dressed. Eliminate the morning anxiety and the shame of owning "so much" while still feeling stuck. Replace paralysis with confidence.

#### Social Job
Present as someone who has their life together — stylishly dressed without visible effort. Not be the person buying yet another item "just in case."

---

### Job 2: The Shopping Regret Problem

**Core Job Statement**: "Help me buy only what genuinely fills a gap in my wardrobe, not what feels exciting in the moment."

**Job Story JS-02: Intelligent Gap Detection**

```
When I'm browsing online or in-store and considering a purchase,
I want to know whether this item genuinely integrates with what I already own,
so I can avoid buying something I'll wear once and never again.
```

#### Functional Job
Cross-reference a potential purchase against owned items to verify compatibility (color, occasion, fit profile) before committing money.

#### Emotional Job
Feel smart and disciplined about spending. Avoid buyer's remorse. Replace impulse-driven guilt with evidence-based confidence.

#### Social Job
Be seen as someone who shops intentionally — conscious about sustainability, not wasteful. In an era of "de-influencing," this identity is desirable.

---

### Job 3: The Resale Friction Problem

**Core Job Statement**: "Help me turn unused clothes into money without the tedious photo and listing work."

**Job Story JS-03: Effortless Resale**

```
When I want to declutter my wardrobe and sell items I no longer wear,
I want to generate professional-quality listing images and descriptions instantly,
so I can list items on Vinted or Depop in minutes rather than hours.
```

#### Functional Job
Transform a phone photo of a garment into a professional resale listing (editorial-style image + description + pricing suggestion) ready to publish.

#### Emotional Job
Feel empowered to actually follow through on decluttering intentions. Remove the activation energy barrier that causes "I'll do it later" to become never.

#### Social Job
Appear as a savvy seller — someone who sells quality items with professional presentation, attracting buyers and getting better prices.

---

### Job 4: The Outfit Inspiration Problem

**Core Job Statement**: "Help me discover new outfits from clothes I already own, not just buy new ones."

**Job Story JS-04: Daily Outfit Intelligence**

```
When I'm planning what to wear tomorrow and want something that feels fresh,
I want the app to suggest complete outfits that match my weather, occasion, and style,
so I can feel excited about getting dressed using things I already own.
```

#### Functional Job
Receive a curated daily outfit suggestion that accounts for weather forecast, planned occasion, and personal style — built entirely from owned items.

#### Emotional Job
Experience that "I have something perfect to wear" feeling. Replace the dull routine of wearing the same 20% of the wardrobe with genuine discovery within what already exists.

#### Social Job
Show up to occasions dressed appropriately and distinctively. Be complimented on outfit choices without revealing the decision was AI-assisted.

---

## Job Priority Summary

| Job | Code | Core Pain | Business Value | MVP Criticality |
|-----|------|-----------|----------------|----------------|
| Wardrobe Visibility | JS-01 | Paralysis getting dressed | Enables all other features | Critical — foundational |
| Daily Outfit Intelligence | JS-04 | Daily engagement loop | Retention driver | Critical — daily habit |
| Intelligent Gap Detection | JS-02 | Shopping regret | Affiliate revenue | Important — deferred to v2 |
| Effortless Resale | JS-03 | Declutter friction | Monetization secondary | Should — deferred to v2 |

**Jobs JS-01 and JS-04 form the core value loop for the MVP walking skeleton.**

JS-02 and JS-03 generate revenue but require JS-01 as their prerequisite. They are natural Phase 3 features once the wardrobe is populated.

---

## Domain Language Glossary

| Term | Definition |
|------|-----------|
| Wardrobe | The complete set of physical clothing items owned by a user |
| Item | A single garment (e.g., white Oxford shirt, slim black jeans) |
| Outfit | A complete combination of items worn together for a specific occasion |
| Digitization | The process of photographing and cataloging a physical item into the digital wardrobe |
| Gap | A missing item category that prevents coherent outfit completion |
| Try-On | AI-rendered visualization of an outfit on the user's body |
| Occasion | The context for which an outfit is intended (work, casual, sport, event) |
| Palette | The color profile of a user's wardrobe or outfit |
| Listing | A resale entry on a marketplace platform (Vinted, Depop) |
