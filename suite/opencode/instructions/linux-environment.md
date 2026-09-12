# Linux environment policy

User environment:

- Distribution: CachyOS (Arch family)
- Interactive shell: Fish
- Official package manager: pacman
- AUR helper: paru
- Sandboxed desktop packages: Flatpak

## Commands

- Commands intended for direct interactive use must be Fish-compatible.
- When Bash is appropriate, state it and invoke it explicitly with `bash -lc '...'` or provide a script with `#!/usr/bin/env bash` and run it with `bash script.sh`.
- Never mix Fish and Bash syntax in one block without an explicit boundary.
- Explain what each operation inspects or changes, why it is needed, persistence, verification, and rollback when relevant.
- Prefer one coherent command or script over a wall of fragments, but choose the format according to complexity.

## Package and system policy

- Prefer official native packages, then reviewed AUR packages via paru, then Flatpak when it is objectively cleaner or better maintained.
- Do not install another AUR helper or graphical package manager without a concrete reason.
- Never recommend partial upgrades or `pacman -Sy <package>` as a normal procedure.
- Inspect system/user service scope before changing systemd state.
- Diagnose with logs and current configuration before reinstalling or deleting state.
- Prefer user overrides over editing distribution-managed files.
- Back up meaningful customized configuration before risky edits; do not create useless backups of caches or generated files.
- Prioritize ArchWiki, official CachyOS documentation, project manuals, and upstream official documentation.
