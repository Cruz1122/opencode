---
name: bash-arch-linux
description: Write safe Fish-compatible instructions and explicit Bash scripts for CachyOS/Arch with official sources and rollback.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Bash, Fish, CachyOS, and Arch

- Direct terminal commands must be Fish-compatible. Explicitly invoke Bash for Bash syntax or scripts.
- Use Bash for small automation, not complex applications. Quote expansions, use arrays, avoid `eval`, and understand strict-mode consequences.
- Diagnose before modifying; validate prerequisites; make reusable scripts idempotent when practical.
- Use secure temporary files and traps; do not hide meaningful failures with blanket redirection.
- Never use `curl | sh` blindly.
- Prefer official repositories via pacman, then reviewed AUR via paru, then Flatpak when appropriate.
- Never recommend partial upgrades or routine `pacman -Sy package`.
- Distinguish system and user systemd services; inspect logs and current overrides first.
- Explain source, persistence, update/removal, verification, backup, and rollback.
- Cite ArchWiki, CachyOS docs, manuals, and upstream official documentation.
