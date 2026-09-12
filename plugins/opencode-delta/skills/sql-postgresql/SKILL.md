---
name: sql-postgresql
description: Model relational invariants, queries, indexes, transactions, locking, and PostgreSQL migrations explicitly.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# SQL and PostgreSQL

- Encode real invariants with constraints, keys, types, and ownership—not application validation alone.
- Parameterize every query with external data.
- Design indexes from actual query patterns and plans; account for write, storage, and lock cost.
- Keep transactions minimal and choose isolation deliberately when defaults do not protect invariants.
- Avoid N+1 and redundant round trips.
- Use `EXPLAIN (ANALYZE, BUFFERS)` carefully for real performance investigation.
- Design migrations for progressive deployment using expand/contract where needed.
- Define cascade/delete behavior explicitly and avoid generic repositories that hide database semantics.
- Prefer explicit SQL when ORM abstractions obscure performance, locking, or correctness.
