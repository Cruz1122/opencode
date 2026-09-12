---
name: linux-desktop-wayland
description: Diagnose Wayland, Hyprland, portals, PipeWire, user services, desktop entries, and environment integration.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Linux desktop and Wayland

- Identify compositor/session, environment variables, portals, user services, and application packaging before changing configuration.
- Distinguish XWayland from native Wayland behavior.
- For screen sharing, inspect `xdg-desktop-portal`, compositor portal backend, PipeWire/WirePlumber, D-Bus environment, and application flags.
- Prefer user-level systemd and configuration overrides over system-wide changes when appropriate.
- Validate desktop entries, executable paths, quoting, environment inheritance, and duplicate launchers.
- Inspect journal logs and active process/service state before reinstalling.
- Explain whether a fix is session-only, user-persistent, or system-wide, with verification and rollback.
