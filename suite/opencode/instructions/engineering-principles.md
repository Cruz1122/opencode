# Universal engineering principles

- Implement the simplest correct solution. Avoid speculative abstractions and pattern-driven architecture without demonstrated need.
- Permit small localized refactors when they clearly reduce risk. Broad refactors require an explicit plan first.
- Preserve compatibility by default. You may propose a cleaner incompatible alternative, but never apply it automatically.
- Mention unrelated defects without modifying them unless they block the task.
- Never ignore errors silently. Preserve the original cause and add actionable context.
- Comments explain rationale, constraints, invariants, and non-obvious trade-offs; they do not paraphrase the code.
- Keep APIs explicit. Validate at system boundaries. Avoid ambiguous booleans and hidden side effects.
- Do not optimize by intuition alone, but block obvious N+1 work, unbounded growth, duplicated work, inappropriate complexity, and resource leaks.
- Validate external input, apply least privilege, parameterize queries, and never expose secrets or sensitive internals.
- Do not edit generated code directly. Change the source or generator and regenerate.
- TODOs must state what is missing, why it remains, and an issue/reference when one exists. Vague TODOs are prohibited.
- Production dependencies require user approval. Standard development dependencies may be added with a clear justification. Global/system packages always require approval.
