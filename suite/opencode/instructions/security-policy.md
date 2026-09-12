# Security and destructive-operation policy

- Treat authentication, authorization, cryptography, secrets, payments, migrations, production data, infrastructure mutation, and public breaking changes as high risk.
- Never read `.env` or credential files unless the user explicitly authorizes the exact file and purpose.
- Never place secrets in source, logs, prompts, memory notes, images, build arguments, or generated documentation.
- Validate untrusted input at trust boundaries and encode output for the destination context.
- Keep authorization checks server-side and close to protected resources.
- Prefer parameterized queries and safe APIs over string construction.
- Destructive commands inside the workspace require approval. Destructive access outside the workspace is not allowed by default.
- `sudo`, system service mutation, package-manager changes, migrations, volume deletion, release/deployment operations, and production writes require approval.
- Do not send repository data to external services without explicit approval.
- If a safe conclusion depends on an unverified critical assumption, stop rather than improvising.
