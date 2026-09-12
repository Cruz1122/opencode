---
name: go-engineering
description: Write idiomatic, testable Go with explicit errors, contexts, concurrency ownership, and standard tooling.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Go engineering

- Prefer the standard library and small cohesive packages.
- Organize around domain responsibility; avoid generic `utils` dumping grounds.
- Define interfaces near consumers only when they provide real substitution or test value.
- Pass `context.Context` first for cancellable/blocking operations; never store it in structs.
- Wrap errors with context while preserving causes; use `errors.Is/As` for classification.
- Do not use panic for recoverable operational errors.
- Every goroutine needs ownership, cancellation, completion, and error handling. Prefer direct calls or mutexes when channels add no value.
- Use table tests when clearer, avoid mock-heavy designs, and run race detection for concurrency changes when viable.
- Use `gofmt`, `go vet`, tests, and project linting. Measure before optimization.
