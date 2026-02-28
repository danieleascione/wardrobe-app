# ADR-006: Development Paradigm — OOP TypeScript

**Status**: Accepted
**Date**: 2026-02-28
**Deciders**: CTO, Morgan (Solution Architect)

---

## Context

PocketWardrobe's backend domain and mobile app are written in TypeScript. TypeScript supports both OOP (class-based entities, interfaces) and FP (algebraic types, pure functions, composition pipelines). The development paradigm choice affects how domain entities, use cases, and the hexagonal architecture are expressed in code.

Two primary paradigms are viable for a TypeScript hexagonal architecture:

**OOP approach**: Domain entities as classes (`Item`, `Wardrobe`, `Outfit`, `StyleProfile`). Ports as TypeScript interfaces. Use cases as classes with injected port dependencies. Adapters as classes implementing port interfaces.

**FP approach**: Domain entities as algebraic data types (TypeScript discriminated unions and types). Ports as function signatures. Use cases as pure functions composed from smaller transformers. Effects isolated to adapter layer. No class instances — data flows through pipeline functions.

The domain contains:
- **Rich stateful entities**: Item lifecycle (draft → pending_ai → pending_review → active → deleted), Wardrobe state (item_count, first_unlock_achieved), Outfit immutability constraint
- **Business rules on state transitions**: 5-item unlock gate, celebration animation one-time flag, outfit invalidation on item delete
- **Identity-based equality**: Items are compared by `item_id`, not by value — fundamental OOP/entity concern
- **AI data transformation pipelines**: Photo → EXIF strip → face check → AI submission → metadata → Item (this sub-pipeline fits FP well)

The team is 4 people, primarily building a consumer mobile product with a Month 2-3 deadline. Team's TypeScript proficiency is assumed; FP-fluency (monads, effect types, composition patterns) is not confirmed.

---

## Decision

**OOP TypeScript** for the domain core, use cases, and adapters.

The AI data transformation sub-pipeline within `DigitizeItem` use case may use functional composition internally — this is an implementation detail (software-crafter decides during GREEN + REFACTOR).

**Rationale**:

1. **Entity identity is central**: Item, Outfit, WearEvent, StyleProfile have `id` fields and lifecycle state — these are canonical OOP entities, not values. Modeling them as classes with encapsulated state is idiomatic.

2. **Mutable state transitions on entities**: Item status transitions (pending → active → deleted), Wardrobe.first_unlock_achieved (boolean flag, written once) are naturally expressed as class methods that enforce invariants.

3. **Port interfaces map directly to TypeScript interfaces**: Hexagonal architecture's port contracts are expressed cleanly as `interface ItemRepositoryPort { ... }` — the OOP idiom TypeScript was designed for.

4. **Team risk**: OOP TypeScript is the industry default. FP TypeScript (with fp-ts or Effect-ts) introduces Functor, Monad, and HKT concepts with a steep learning curve. At a 4-person team, 2-3 month timeline, introducing fp-ts as the primary paradigm would increase delivery risk.

5. **Fashion domain is entity-rich**: The domain language (Item, Wardrobe, Outfit, Occasion, WearEvent) maps naturally to named classes. FP is most advantageous in data-transformation-heavy domains (compilers, ETL pipelines) where pure pipelines dominate.

---

## Consequences

### Positive
- Domain entities directly mirror ubiquitous language — `class Item`, `class Wardrobe`, `class OutfitSuggestion`
- TypeScript interfaces as port contracts are idiomatic — no learning curve for port definition
- Constructor injection for use cases is clean OOP — standard for hexagonal architecture
- Industry-standard patterns: easier to onboard future engineers, more Stack Overflow coverage
- No additional FP libraries required — reduces dependency footprint

### Negative
- OOP can allow mutation to proliferate if discipline is not maintained — mitigation: domain entities expose mutation only through intent-revealing methods; `readonly` on all entity fields except those explicitly mutated
- OutfitSuggestion immutability must be explicitly enforced (no setter on `item_ids`) — OOP requires discipline; FP would enforce this at the type system level
- Testing: OOP requires mock objects for ports (Vitest's `vi.fn()` or `createMock`) vs FP's pure function substitution — slightly more boilerplate in test setup

---

## Alternatives Considered

### Alternative 1: Functional TypeScript (FP-first with fp-ts or Effect-ts)
- **Strengths**: Type-safe effect handling; `Either` / `Result` types make error paths explicit; pure functions are trivially testable without mocks; composition pipelines fit AI processing chain well
- **Weaknesses for this context**: fp-ts and Effect-ts have steep learning curves (HKTs, monadic chaining, Functor/Applicative/Monad hierarchy); team risk at 4 people, 2-3 month deadline; fashion domain entities (Item with lifecycle, Wardrobe with mutable item_count) are not naturally modeled as pure values; React Native community patterns are OOP-dominant; debugging fp-ts pipe chains is harder for junior contributors
- **Rejected as primary paradigm**: Delivery risk outweighs type-safety benefit for this team size and timeline. FP composition may be adopted within specific use case implementations (e.g., AI processing pipeline) as an internal implementation choice — software-crafter decides during GREEN + REFACTOR.

### Alternative 2: Mixed paradigm (OOP entities + FP transformation pipelines)
- Domain entities as classes; AI processing and outfit suggestion algorithms as pure function pipelines; ports as interfaces
- This is a pragmatic middle ground and not excluded by this ADR
- The boundary: entities are OOP; data transformation logic within use cases may be FP internally
- **Deferred to software-crafter**: This ADR establishes OOP as the primary paradigm. The crafter may apply FP internally within use case methods where it produces cleaner code — the architectural boundary remains intact either way.
