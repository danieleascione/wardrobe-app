# ADR-001: Hexagonal Architecture (Ports and Adapters)

**Status**: Accepted
**Date**: 2026-02-28
**Deciders**: CTO, Morgan (Solution Architect)

---

## Context

PocketWardrobe integrates multiple external systems with high substitution risk:
- Nano Banana API (proprietary AI — performance and cost must be validated via TT-01 spike; fallback plan required)
- Weather API (provider may change based on cost at scale)
- Image storage (S3 today; self-hosting possible if cost grows)
- Database (Supabase is convenient but proprietary-hosted; PostgreSQL is portable)

The team is 4 people with a Month 2-3 delivery target. Testability of the outfit suggestion engine and digitization pipeline is critical — these contain the highest-value business logic and must be unit-testable without live infrastructure.

The domain contains non-trivial business rules:
- BR-04: Rotation constraint (7-day / 3-day window by wardrobe size)
- BR-01: 5-item unlock gate
- BR-03: Minimum 3 items per outfit
- BR-08: Invalidation of outfits on item deletion
- Unworn eligibility gate (15 items, 7 days)

**Explicitly requested**: hexagonal architecture was specified by the product team as the architectural approach.

---

## Decision

Apply hexagonal architecture (ports and adapters) to the backend domain:

- **Domain core**: pure TypeScript — no framework, no library dependencies. Contains entities, value objects, and use case logic.
- **Inbound ports**: interfaces defining the use cases the domain exposes (`OutfitSuggestionPort`, `ItemDigitizationPort`, etc.)
- **Outbound ports**: interfaces defining what the domain requires from infrastructure (`ItemRepositoryPort`, `AIProcessorPort`, etc.)
- **Adapters**: technology-specific implementations of ports (`SupabaseItemRepository`, `NanaBananaAdapter`, etc.)
- **Dependency rule**: all dependencies point inward. Domain core imports nothing external. Adapters import their port interface + external libraries.

---

## Consequences

### Positive
- Domain core is fully unit-testable with port mocks — no database or HTTP required
- Any external service can be swapped by writing a new adapter without touching domain logic
- Nano Banana can be replaced (or supplemented) if TT-01 spike reveals quality or cost issues
- Business rules are centralized in the domain, not scattered across Lambda handlers
- Onboarding new developers: clear boundary between domain knowledge and infrastructure plumbing

### Negative
- Initial overhead: ~5 additional interface files compared to a layered approach
- Constructor injection required for all use cases — slightly more ceremony in Lambda handler wiring
- Team must enforce the dependency rule (tooling: `dependency-cruiser` can lint import direction)

### Neutral
- No additional runtime cost — hexagonal is a code organization choice, not an infrastructure choice
- Monorepo structure required to share domain package between Lambda functions

---

## Alternatives Considered

### Alternative 1: Layered Architecture (Controller → Service → Repository)
- Classic three-layer approach, familiar to most developers
- Trade-off: Domain logic mixes with infrastructure concerns in Service layer; harder to test without live DB
- **Rejected**: Outfit engine and digitization pipeline have complex business rules that benefit from isolation. Layered approach would make those rules harder to extract and test independently.

### Alternative 2: Flat Lambda Functions (no domain layer)
- Each Lambda handler contains all logic inline: DB query + business rule + external API call
- Trade-off: Fastest to start; becomes unmaintainable as rules grow (BR-04 rotation logic, eligibility gates, invalidation logic)
- **Rejected**: Business rule count and complexity (10 explicit BRs, all requiring independent testability) exceeds what inline handlers can cleanly manage for a 9-month roadmap.
