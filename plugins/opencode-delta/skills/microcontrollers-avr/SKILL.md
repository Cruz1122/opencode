---
name: microcontrollers-avr
description: Apply AVR-specific register, interrupt, timer, UART, ADC, EEPROM, servo, and hardware validation discipline.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# AVR microcontrollers

- Use registers directly or a HAL according to complexity, but encapsulate hardware access in small drivers.
- Keep pin maps, clock assumptions, prescalers, units, and timing calculations explicit.
- Keep ISRs short and analyze atomic access to multi-byte/shared values.
- Design timers, PWM, UART, ADC, EEPROM, debouncing, and state machines without blocking unrelated events.
- Separate UART control protocol from debug output when sharing a channel.
- Define boot and safe actuator states, movement limits, timeouts, and sensor-failure behavior.
- Avoid `malloc/free` by default; justify exceptions.
- Verify with host-side tests where possible and report `verified by software, pending hardware validation` until a real-device checklist is completed.
