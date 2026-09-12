#!/usr/bin/env python3
from __future__ import annotations
import argparse, datetime as dt, os, pathlib, shutil, subprocess, sys

CONFIG = pathlib.Path(__file__).resolve().parents[1]
TEMPLATES = CONFIG / "brain-templates"
CURSOR = CONFIG / "cursor"


def run(command, cwd=None, check=False, capture=True):
    return subprocess.run(command, cwd=cwd, check=check, text=True, stdout=subprocess.PIPE if capture else None, stderr=subprocess.PIPE if capture else None)


def git_root(cwd: pathlib.Path):
    result = run(["git", "rev-parse", "--show-toplevel"], cwd=cwd)
    return pathlib.Path(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip() else cwd.resolve()


def append_exclude(root: pathlib.Path, entry: str):
    git_dir = root / ".git"
    if not git_dir.exists(): return
    exclude = git_dir / "info" / "exclude"
    exclude.parent.mkdir(parents=True, exist_ok=True)
    existing = exclude.read_text() if exclude.exists() else ""
    if entry not in {line.strip() for line in existing.splitlines()}:
        with exclude.open("a") as handle:
            if existing and not existing.endswith("\n"): handle.write("\n")
            handle.write(entry + "\n")


def copy_tree(source: pathlib.Path, target: pathlib.Path):
    for item in source.rglob("*"):
        relative = item.relative_to(source)
        destination = target / relative
        if item.is_dir(): destination.mkdir(parents=True, exist_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, destination)


def create_local_cursor(root: pathlib.Path):
    rules = root / ".cursor" / "rules"
    rules.mkdir(parents=True, exist_ok=True)
    target = rules / "project-brain.mdc"
    if not target.exists():
        shutil.copy2(CURSOR / "project-brain.mdc", target)
        append_exclude(root, "/.cursor/rules/project-brain.mdc")
    for name, source in [(".cursorignore", CURSOR / "cursorignore"), (".cursorindexingignore", CURSOR / "cursorindexingignore")]:
        target_file = root / name
        if not target_file.exists():
            shutil.copy2(source, target_file)
            append_exclude(root, f"/{name}")
        else:
            print(f"[brain] Existing {name} was not modified. Merge the suite snippet manually if needed.")


def generate(args):
    cwd = pathlib.Path(args.directory).expanduser().resolve()
    root = git_root(cwd)
    if root == pathlib.Path.home() or root == pathlib.Path("/"):
        raise SystemExit("Refusing to generate a project brain in HOME or filesystem root")
    brain = root / "brain"
    if brain.exists():
        raise SystemExit(f"brain/ already exists at {brain}. No files were overwritten.")
    if (root / ".git").exists():
        tracked = run(["git", "ls-files", "brain"], cwd=root)
        if tracked.stdout.strip(): raise SystemExit("brain/ is already tracked by Git; resolve that before generation")
    copy_tree(TEMPLATES, brain)
    for directory in [
        "architecture/diagrams", "decisions/accepted", "decisions/proposed", "decisions/rejected", "decisions/superseded",
        "incidents/active", "incidents/verified", "incidents/resolved", "research/findings", "research/sources",
        "memory/candidates", "memory/verified", "memory/obsolete", "open-questions", "assets/diagrams", "private"
    ]:
        (brain / directory).mkdir(parents=True, exist_ok=True)
        (brain / directory / ".keep").touch()
    append_exclude(root, "/brain/")
    append_exclude(root, "/.opencode/.workflow/")
    create_local_cursor(root)
    print(f"[brain] Local vault created at {brain}")

    if args.scaffold_only:
        print("[brain] Scaffold-only mode: AI inventory skipped.")
        return
    if not shutil.which("opencode"):
        print("[brain] OpenCode is not available in PATH. Scaffold created; AI inventory skipped.", file=sys.stderr)
        return

    prompt = """Initialize the local project brain after inspecting the repository. Delegate repository mapping to @cartographer and memory organization/duplicate checks to @archivist. Populate only brain/00-home.md, brain/context/project-overview.md, brain/architecture/system-map.md, brain/development/commands.md, and brain/development/testing.md. Use evidence paths for every factual claim. Mark direct executable facts verified, architectural interpretation inferred, and uncertain claims candidate. Include a useful high-level Mermaid system map. Do not modify source code, tests, project configuration, Git state, or accepted decisions. Keep documents concise and linked."""
    log = brain / "private" / f"generation-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}.log"
    command = ["opencode", "run", "--agent", "agent", "--dir", str(root), prompt]
    print("[brain] Running OpenCode repository inventory...")
    with log.open("w") as handle:
        result = subprocess.run(command, cwd=root, text=True, stdout=handle, stderr=subprocess.STDOUT)
    if result.returncode != 0:
        print(f"[brain] Inventory failed with exit code {result.returncode}. Scaffold remains valid. See {log}", file=sys.stderr)
        return
    print(f"[brain] Inventory completed. Log: {log}")
    print(f"[brain] Open `{brain}` as an Obsidian vault.")


def status(args):
    root = git_root(pathlib.Path(args.directory).expanduser().resolve())
    brain = root / "brain"
    if not brain.exists(): raise SystemExit("No brain/ exists in this workspace")
    candidates = list((brain / "memory" / "candidates").glob("*.md")) if (brain / "memory" / "candidates").exists() else []
    verified = list((brain / "memory" / "verified").glob("*.md")) if (brain / "memory" / "verified").exists() else []
    print(f"Brain: {brain}\nCandidates: {len(candidates)}\nVerified memories: {len(verified)}")


def main():
    parser = argparse.ArgumentParser(prog="brain", description="Manage a local project brain for OpenCode, Obsidian and Cursor")
    sub = parser.add_subparsers(dest="command", required=True)
    generate_parser = sub.add_parser("generate", help="Create a local brain and optionally inventory the repository with OpenCode")
    generate_parser.add_argument("--directory", "-d", default=".")
    generate_parser.add_argument("--scaffold-only", action="store_true")
    generate_parser.set_defaults(func=generate)
    status_parser = sub.add_parser("status", help="Show local brain counts")
    status_parser.add_argument("--directory", "-d", default=".")
    status_parser.set_defaults(func=status)
    args = parser.parse_args()
    args.func(args)

if __name__ == "__main__": main()
