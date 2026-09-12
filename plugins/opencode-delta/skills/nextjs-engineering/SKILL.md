---
name: nextjs-engineering
description: Use modern Next.js server/client boundaries, App Router, caching, routing, metadata, and deployment-aware behavior.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Next.js engineering

For new projects prefer App Router unless requirements dictate otherwise.

- Server Components by default; add Client Components only for browser APIs, state, effects, or interaction.
- Keep server-only secrets and modules out of client bundles.
- Make data fetching, caching, revalidation, streaming, and dynamic/static behavior explicit.
- Use route handlers and Server Actions according to contract and client needs; Server Actions do not replace every API.
- Validate action and route inputs server-side and enforce authorization at the operation.
- Handle Suspense/loading/error/not-found boundaries intentionally.
- Treat metadata, canonical URLs, images, fonts, and public performance as product requirements.
- Understand middleware/runtime/deployment constraints before choosing Edge or Node execution.
- Avoid unnecessary client waterfalls and duplicated server data in stores.
