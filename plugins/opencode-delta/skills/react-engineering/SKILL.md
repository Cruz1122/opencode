---
name: react-engineering
description: Build composable React components with correct state ownership, effects, rendering, and behavior-focused tests.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# React engineering

- Prefer composition, small focused components, and explicit state ownership.
- Derive values during render instead of synchronizing redundant state.
- Use effects only to synchronize with external systems; clean up subscriptions and async work.
- Keep server state, URL state, form state, and local UI state distinct.
- Do not add global state while local/context/URL/server-state solutions suffice.
- Avoid preventative `memo`, `useMemo`, and `useCallback`; measure first.
- Avoid stale closures, uncontrolled async races, oversized contexts, prop drilling, and excessive custom hook layers.
- Respect controlled/uncontrolled component semantics and accessibility.
- Test behavior through the user-facing contract.
