---
name: system-design
description: Design system boundaries, data flows, APIs, failure modes, scalability, and operational trade-offs.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# System design

- Start from functional and non-functional requirements, constraints, and expected scale.
- Prefer a modular monolith unless independent scaling, failure isolation, or organizational boundaries justify distribution.
- Define component responsibilities, data ownership, contracts, trust boundaries, synchronous/asynchronous flows, and failure handling.
- Address consistency, idempotency, retries, timeouts, observability, deployment, rollback, and migration strategy.
- Compare realistic alternatives with explicit trade-offs; avoid fashionable complexity.
- Produce high-level architecture and low-level critical-path diagrams.
