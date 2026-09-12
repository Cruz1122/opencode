---
name: docker-containers
description: Build reproducible non-root containers with minimal images, safe secrets, signals, health, and development separation.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Docker and containers

- Use reproducible builds and appropriate version pinning.
- Use multi-stage builds when they reduce final size and attack surface.
- Run as non-root and copy only required artifacts.
- Never bake secrets into images, build args, or repositories.
- Maintain `.dockerignore`; separate build-time and runtime configuration.
- Handle PID 1 signals and graceful shutdown correctly.
- Health checks must represent useful health, not mere process existence.
- Compose is appropriate for real local dependencies; production is not automatically a copy of development Compose.
- Never delete volumes automatically. Container/system mutation requires approval.
