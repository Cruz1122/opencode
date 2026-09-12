---
name: code-review
description: Review diffs for correctness, scope, tests, contracts, maintainability, security, and evidence.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Code review

Review the diff and acceptance criteria, not an imagined rewrite.

- Confirm scope and detect unrelated changes.
- Check correctness, error paths, contracts, tests, compatibility, generated artifacts, and temporary instrumentation.
- Separate blockers from recommendations.
- Every blocker needs location, evidence, impact, and a bounded required change.
- Do not reject for personal style when the project has no rule.
- Note strengths that corrections must preserve.
- Explicitly state skipped or impossible verification.
