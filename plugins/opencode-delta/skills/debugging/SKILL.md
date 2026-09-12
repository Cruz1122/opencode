---
name: debugging
description: Apply evidence-driven reproduction, hypothesis isolation, regression testing, and instrumentation cleanup.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Debugging playbook

1. Reproduce with a minimal deterministic case.
2. Capture evidence: logs, inputs, state, versions, timing, environment.
3. Form ranked hypotheses and identify disconfirming evidence.
4. Instrument narrowly; avoid broad logging noise.
5. Isolate and prove root cause.
6. Add regression coverage before or alongside the fix.
7. Apply the smallest correct fix and verify adjacent behavior.
8. Remove temporary instrumentation, files, flags, and exploratory tests.

Do not confuse symptom disappearance with root-cause correction. Label workarounds and their limits.
