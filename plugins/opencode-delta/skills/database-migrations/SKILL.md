---
name: database-migrations
description: Plan safe, reversible, deployment-compatible schema and data migrations.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Database migrations

- Follow the project's migration tool and conventions.
- Prefer expand/contract for incompatible changes.
- Keep transactions and locks bounded; assess table size and production behavior.
- Avoid immediate destructive drops or blocking NOT NULL/default changes without strategy.
- Backfill in controlled batches when necessary.
- Preserve compatibility across rolling/progressive deployments.
- Define verification, observability, rollback/roll-forward, and data-loss risk.
- Production migration execution always requires explicit approval.
