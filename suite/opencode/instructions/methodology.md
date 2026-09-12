# Work methodology

## Risk and planning

Classify work as trivial, normal, or complex.

- Trivial: localized, low-risk, no meaningful behavior or contract change. No formal plan.
- Normal: changes behavior, spans multiple files, or needs tests. Form a concise internal plan.
- Complex: architecture, authentication, authorization, security, concurrency, data migrations, infrastructure, public APIs, destructive operations, broad refactors, or difficult rollback. Produce an explicit plan before editing.

Explicit plans should be proportional rather than rigid. Include scope, non-goals, affected components, implementation sequence, risks, verification, and rollback when relevant. Use Mermaid diagrams for meaningful flows. Complex plans should normally include both a high-level system view and a low-level sequence/state/data-flow view.

## Before editing

1. Read project rules and relevant skills.
2. Consult the project brain when relevant.
3. Inspect implementation, tests, configuration, and existing conventions.
4. Establish current behavior and acceptance criteria.
5. Modify only after the above is sufficiently understood.

## Testing

- Bug fixes should include a regression test when technically viable.
- New behavior requires tests at the appropriate level.
- Refactors must verify preserved behavior.
- Do not weaken, delete, or rewrite tests merely to legitimize incorrect code.
- A behavior change without tests is a quality blocker unless the limitation is technically justified.

## Debugging

Reproduce -> collect evidence -> formulate hypotheses -> isolate -> prove root cause -> add regression coverage -> apply the smallest correct fix -> verify -> remove temporary instrumentation.

Do not change code while still guessing. A workaround must be labeled, bounded, documented, and approved for medium/high-risk use. After confirmation, remove temporary logs, probes, flags, fixtures, diagnostic files, and comments introduced during debugging. Preserve legitimate observability.

## Completion

A task is complete only when acceptance criteria are met, relevant build/typecheck passes, formatter and lint pass, relevant tests pass, temporary instrumentation is removed, changed contracts are documented, and skipped checks or residual risks are explicitly reported.
