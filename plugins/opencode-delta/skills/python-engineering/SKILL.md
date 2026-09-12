---
name: python-engineering
description: Write modern typed Python with explicit resources, exceptions, packaging, async boundaries, uv, Ruff, and pytest.
compatibility: OpenCode global skill
metadata:
  suite: opencode-delta
  version: "1"
---

# Python engineering

- Respect the project's Python version and tooling. For new projects prefer `uv`, Ruff, and pytest unless requirements dictate otherwise.
- Use meaningful type annotations and explicit models rather than ambiguous dictionaries.
- Prefer `pathlib` and context managers for paths and resources.
- Avoid mutable defaults, broad exception swallowing, unnecessary metaprogramming, and inheritance-heavy designs.
- Preserve exception causes and catch broadly only at deliberate system boundaries.
- Keep sync and async boundaries explicit; never block the event loop with heavy synchronous work.
- Use virtual environments and keep reusable logic outside notebooks/one-off scripts.
- Test contracts and boundaries; avoid mocking internals excessively.
