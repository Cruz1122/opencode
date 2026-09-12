---
name: angular-engineering
description: Use Angular-native standalone components, DI, signals/RxJS, forms, routing, change detection, and tests.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Angular engineering

- Follow Angular conventions rather than translating React patterns.
- Prefer standalone components for new work when consistent with project version.
- Keep dependency injection scoped and services purposeful.
- Choose signals for synchronous reactive state and RxJS for asynchronous streams/events; do not mix without clear ownership.
- Manage subscriptions through framework-supported lifecycle/disposal patterns.
- Use typed reactive forms for complex forms; validate at client and server boundaries.
- Keep change detection and rendering costs visible; avoid template work with hidden heavy computation.
- Use guards/resolvers appropriately without treating client guards as authorization.
- Test component behavior, services, routes, and critical integration boundaries.
