---
name: typescript-javascript
description: Use strict TypeScript, runtime validation, explicit state modeling, and safe async/error boundaries.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# TypeScript and JavaScript

- Prefer strict TypeScript for new production code; follow existing project language choices.
- Avoid `any`; use `unknown` plus narrowing for external data.
- Model invalid states out with unions, branded/domain types, and explicit nullability when beneficial.
- Validate external data at runtime; static types do not validate network, storage, or user input.
- Preserve async errors and cancellation; avoid floating promises and hidden fire-and-forget work.
- Keep modules cohesive and dependencies directional.
- Do not create service/hook/repository wrappers that merely rename one call.
- Respect configured formatter, linter, module system, package manager, and test framework.
