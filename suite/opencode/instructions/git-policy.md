# Git policy

## Branches

Create branches automatically only for complex work with an explicit plan, or when the user asks. Use:

`type/short-kebab-case-description`

Allowed common types: `feat`, `fix`, `hotfix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `spike`.

Do not switch branches automatically when uncommitted changes could be carried or conflicted.

## Commits

Use short Conventional Commits in English:

`type(optional-scope): imperative description`

A commit is one logical unit and contains only related paths. Inspect status, full diff, and staged diff first. Never use broad staging when unrelated changes exist. Prefer explicit paths over `git add .` or `git add -A`.

Do not commit unless the user explicitly requests it. Never push automatically. Pull/fetch must stop on divergence, conflict, or risk to local work. Merge, rebase, cherry-pick, revert, stash, tags, push, force-push, and releases require approval.

When the worktree contains unrelated user changes, continue without touching them. Stop editing when required files overlap those changes.
