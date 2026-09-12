---
name: planning-and-design
description: Plan proportional software changes with explicit scope, risks, diagrams, verification, and rollback.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Planning and design

Use for normal or complex implementation planning.

- Establish current behavior from code/tests before proposing changes.
- Define objective, scope, non-goals, affected components, assumptions, risks, verification, and rollback proportionally.
- Classify risk: trivial, normal, complex.
- Broad refactors, architecture, data, security, concurrency, infrastructure, and public contracts require explicit planning.
- Use Mermaid when flow or architecture is material: high-level boundaries plus low-level sequence/state/data flow for complex work.
- Separate required changes, support refactors, and optional improvements.
- End with an implementation handoff that another agent can execute without re-discovering the problem.
