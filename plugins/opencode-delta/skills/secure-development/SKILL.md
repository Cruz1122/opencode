---
name: secure-development
description: Apply trust-boundary validation, least privilege, authorization, secret safety, and common vulnerability controls.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Secure development

- Map trust boundaries and assets before controls.
- Validate and normalize untrusted input; encode output for its context.
- Separate authentication from authorization and enforce authorization server-side.
- Parameterize queries and avoid command/path construction from untrusted strings.
- Protect against XSS, CSRF, SSRF, traversal, unsafe deserialization, replay, and race conditions where applicable.
- Never log or persist secrets and sensitive payloads unnecessarily.
- Use least privilege, safe defaults, bounded resources, timeouts, and explicit failure behavior.
- Security-critical changes require targeted tests and independent review.
