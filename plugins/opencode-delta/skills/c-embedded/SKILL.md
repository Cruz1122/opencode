---
name: c-embedded
description: Design bounded, safe embedded C with explicit state machines, ISR discipline, timing, and hardware-safe failure states.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Embedded C

- Respect the existing C standard and toolchain; prefer C11/C17 for new work when supported.
- Avoid dynamic allocation by default. Use bounded buffers, explicit ownership, units, and meaningful constants.
- Model physical flows as explicit state machines, not scattered flags.
- Keep ISRs minimal: capture state and defer work. Analyze `volatile`, atomicity, critical sections, and shared-state races.
- Separate drivers, control logic, protocols, UI, and diagnostics without building an oversized HAL.
- Avoid blocking delays in multi-event systems; use timers/timestamps.
- Define boot state, safe state, timeouts, sensor/actuator limits, and fault behavior.
- Test hardware-independent logic on host and document physical validation separately.
