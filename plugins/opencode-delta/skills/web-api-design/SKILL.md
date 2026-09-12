---
name: web-api-design
description: Design explicit, validated, observable REST/GraphQL/RPC contracts with idempotency and compatibility.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Web API design

- REST is the default for new public APIs; GraphQL requires query-shape value; typed RPC fits controlled internal communication.
- Define request, response, error, status, pagination, and compatibility contracts explicitly.
- Validate at the boundary and never expose persistence models directly as public contracts.
- Separate authentication from authorization.
- Design retryable writes with idempotency when appropriate.
- Bound payload size, time, concurrency, and resource consumption.
- Do not leak stack traces, SQL, secrets, or internal details.
- Add structured logs and appropriate metrics/traces at boundaries.
- Keep meaningful business logic out of thin transport handlers.
