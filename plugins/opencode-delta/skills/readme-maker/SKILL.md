---
name: readme-maker
description: Use when creating or refreshing a repository README. Inspect the repository first, then write a clear, polished README that feels like a serious open-source project without forcing unnecessary sections or generic filler.
compatibility: opencode
metadata:
  category: documentation
  risk: low
---

# readme-maker

## Purpose

Create or update `README.md` from repository evidence. The result should be technically useful, easy to scan, and natural rather than corporate or template-heavy.

A good README should help a new developer understand what the project is, how it is organized, and how to run or verify it. It does not need to document every internal detail.

## Use when

- Creating a missing README.
- Rewriting a stale or weak README.
- Updating setup, commands, structure, stack, badges, or architecture after repository changes.
- Standardizing a README while preserving the project's personality.
- Documenting a monorepo, service collection, CLI, library, application, or agent workspace.

For a tiny typo or one-line correction, edit directly without loading this full workflow.

## Evidence to inspect

Read only what is relevant. Common sources include:

- Existing `README.md` and files under `docs/`.
- Package manifests and workspace files.
- `Makefile`, `justfile`, `Taskfile.yml`, or `scripts/`.
- `.env.example` and runtime configuration examples.
- Dockerfiles and Compose files.
- Application and package directories.
- CI workflows.
- Framework, test, lint, formatter, migration, and build configuration.
- Lockfiles only to identify the package manager or confirm versions; do not summarize lockfile noise.

Prefer executable configuration and scripts over stale prose when they disagree.

## Writing principles

### Evidence first

Do not invent commands, ports, versions, features, logos, or architectural claims. When something cannot be verified, omit it or mark it briefly as unverified.

### Fit the repository

Do not force every README into the same outline. Choose sections based on what a reader actually needs for this repository.

A library may need installation and usage examples. A web app may need local services and environment setup. A monorepo may need a structure table. A small CLI may need only a compact overview, install command, examples, and development notes.

### Serious but casual tone

Write like a well-maintained engineering repository:

- Clear and direct.
- Technically specific.
- Friendly without marketing fluff.
- Short paragraphs and useful examples.
- No forced "enterprise" language.
- No generic claims such as "powerful", "modern", or "easy to use" unless the repository proves them and the wording adds value.

### Flexible presentation

A centered title, logo, and badges are welcome when the repository already has suitable assets or the user requests that style. They are optional, not mandatory.

Use tables, trees, and diagrams only when they improve comprehension. Do not add an architecture section merely to fill space. Do not add a "what this project does not do" section unless a boundary is genuinely important to users.

### Preserve project language and personality

Follow the language already used by the repository unless the user requests another. Keep useful existing wording and project-specific personality while removing stale or unsupported claims.

## Workflow

1. Inspect the repository root and current README.
2. Identify the project name, purpose, audience, stack, package manager, runtime, important directories, commands, services, and documentation.
3. Decide the smallest useful README structure.
4. Preserve accurate existing content and rewrite weak or stale sections.
5. Add badges only for important, verified technologies or project status.
6. Add setup and run commands exactly as defined by scripts or documentation.
7. Describe architecture or repository structure only to the depth needed for orientation.
8. Validate every referenced path, command, port, version, and asset.
9. Remove filler, duplication, dead instructions, and claims contradicted by the repository.

## Common sections

Choose only the sections that help:

- Overview
- Features or capabilities
- Screenshots or demo
- Architecture
- Repository structure
- Requirements
- Installation
- Configuration
- Usage
- Development
- Services and ports
- Testing and quality
- Migrations
- Deployment
- Documentation
- Troubleshooting
- Contributing
- License

Section names should match the language and tone of the repository.

## Headers, logos, and badges

When an existing logo is available, a clean centered header is appropriate:

```html
<p align="center">
  <img src="./path/to/logo.svg" alt="Project name" width="160" />
</p>

<h1 align="center">Project name</h1>
<p align="center"><em>Short, factual subtitle</em></p>
```

If no suitable logo exists, omit the image. Never reference a proposed or missing file as though it exists.

For badges:

- Use Shields.io or existing project badges.
- Prefer a small set of useful badges over a dependency wall.
- Derive versions from repository files when a version badge is useful.
- It is acceptable to omit versions and badge groups entirely.

## Architecture and structure

Explain the project at the level a new contributor needs. A compact tree is often enough:

```text
apps/
  web/        User-facing application
  api/        HTTP API
packages/
  domain/     Shared domain logic
  config/     Shared tooling configuration
```

For a simple repository, avoid pretending it has a grand architecture. For a complex repository, describe runtime boundaries and important data flows concretely.

## Commands

Commands must match repository evidence. Prefer a compact table when there are several:

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development environment |
| `pnpm test` | Run the test suite |
| `pnpm build` | Build production artifacts |

Do not include commands that merely seem conventional for the stack.

## Validation checklist

Before finalizing:

- Referenced files and assets exist.
- Versions come from repository evidence or are omitted.
- Install, run, test, lint, build, and migration commands are accurate.
- Ports and service names match configuration.
- The structure description matches the actual repository.
- Stale claims from the old README have been removed.
- The README is useful without being bloated.
- The tone feels like a serious repository, not a generated specification document.

## Editing report

After editing the repository, respond briefly:

```text
README updated.

Main changes:
- <important improvement>
- <important improvement>
- <important improvement>

Verified from:
- <key repository files>

Unverified:
- <only when relevant>
```

When drafting without file access, produce the README and clearly mark placeholders or unverified details. Ask for missing facts only when they materially block an accurate result.