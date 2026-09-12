---
name: testing-strategy
description: Choose unit, integration, end-to-end, contract, property, performance, and manual tests by risk.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Testing strategy

- Test observable behavior and contracts, not incidental implementation details.
- Use unit tests for pure/local logic, integration tests for boundaries and persistence, contract tests for interfaces, and E2E for critical user journeys.
- Bugs require regression tests when viable.
- Cover happy path, boundaries, malformed input, failures, retries, concurrency, and recovery according to risk.
- Avoid excessive mocks; prefer real small components, fakes, and boundary adapters.
- Keep tests deterministic, isolated, readable, and fast enough for their layer.
- Do not chase coverage percentages without analyzing meaningful gaps.
- Document manual/hardware checks that software cannot prove.
