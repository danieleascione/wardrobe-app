# ADR-002: Mobile Framework — React Native + Expo

**Status**: Accepted
**Date**: 2026-02-28
**Deciders**: CTO, Morgan (Solution Architect)

---

## Context

PocketWardrobe requires a cross-platform mobile app targeting iOS and Android. Key mobile requirements:
- Camera access (item digitization — primary feature)
- Gallery access (alternative import path)
- Push notification receipt (morning outfit card)
- Offline wardrobe browsing
- High-performance grid rendering (up to 200 items)
- < 2 second cold start

The team is 4 people. The CTO owns backend + mobile. Development paradigm is TypeScript (see ADR-006). Reducing context switching between backend and mobile is a priority given team size.

The backend is Node.js/TypeScript Lambda (see ADR-003). Domain types (Item, Outfit, StyleProfile) need to be shared between backend and mobile — shared TypeScript package in monorepo.

---

## Decision

**React Native 0.74 with Expo SDK 51** (MIT license).

- Expo toolchain reduces native module management overhead (no Xcode/Android Studio expertise required for core features)
- EAS Build for CI/CD distribution to TestFlight and Google Play Internal Track
- Expo Managed Workflow for MVP; eject to Bare Workflow if native modules require it post-MVP

**Key library choices**:
- `@shopify/flash-list` for wardrobe grid (MIT; proven at 200+ item lists)
- `@tanstack/react-query` for server state + offline cache persistence (MIT)
- `react-native-mmkv` for device storage / offline queue (MIT)
- `expo-router` for navigation (MIT)

---

## Consequences

### Positive
- TypeScript monorepo: domain types shared between `packages/domain` and `packages/mobile` — no type duplication, no drift
- Expo Camera and Expo Image Picker are well-maintained, handle permissions consistently across platforms
- Expo Notifications abstracts APNs (iOS) + FCM (Android) — single integration
- OTA updates via Expo Updates for non-native changes (UI, business logic) — faster iteration
- Large React Native community; extensive Expo documentation

### Negative
- Some advanced native modules require ejecting to Bare Workflow (not expected in MVP scope)
- React Native bridge performance on very rapid animations (not a concern for wardrobe app)
- App binary size larger than native (Expo bundle ~20MB baseline)

---

## Alternatives Considered

### Alternative 1: Flutter (Google, BSD-3 license)
- **Strengths**: Excellent rendering performance, strong widget system, growing ecosystem, Dart null-safety
- **Weaknesses for this context**: Dart is an additional language for the team (context switching cost); no TypeScript monorepo sharing with Node.js backend; Pub.dev ecosystem is smaller for the specific libraries needed (React Query equivalent is less mature); CTO unfamiliar with Dart increases risk at 4-person team scale
- **Rejected**: Language switching cost and inability to share TypeScript domain types with backend outweigh Flutter's rendering performance advantage (wardrobe grid ≤ 200 items is well within React Native + FlashList capability)

### Alternative 2: React Native (Bare Workflow, no Expo)
- Same language and ecosystem as chosen approach
- Requires more native module management expertise
- Higher maintenance overhead for a 4-person team
- **Rejected**: Expo Managed Workflow provides sufficient capability for MVP scope; bare workflow available as an upgrade path if needed

### Alternative 3: Progressive Web App (PWA)
- No native install required; works in browser
- Camera access limited on iOS PWA
- Push notifications on iOS PWA are unreliable (morning outfit card is a key retention mechanism)
- **Rejected**: Camera-first digitization and reliable push notifications are non-negotiable for the MVP core loop
