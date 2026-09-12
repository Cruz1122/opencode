---
name: flutter-engineering
description: Build adaptive Flutter apps with explicit widget composition, state ownership, lifecycle, navigation, and tests.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Flutter engineering

- Separate business/domain logic from widgets and platform integrations.
- Prefer small composable widgets and explicit state ownership.
- Choose state management according to app complexity and existing conventions; do not impose a library globally.
- Handle widget lifecycle, subscriptions, controllers, disposal, Futures, and Streams correctly.
- Make navigation and deep-link behavior explicit.
- Build responsive and adaptive layouts for target platforms; do not assume mobile-only behavior.
- Minimize rebuild scope and profile before optimization.
- Test pure logic, widgets, navigation, and critical integration flows.
- Respect platform permission, storage, networking, and background-execution constraints.
