#!/usr/bin/env python3
"""Risk-based stop gate for the OpenCode Delta Codex adapter.

Modes:
  OPENCODE_DELTA_CODEX_QUALITY=off       Disable the gate.
  OPENCODE_DELTA_CODEX_QUALITY=balanced  Review complex/high-risk changes only (default).
  OPENCODE_DELTA_CODEX_QUALITY=strict    Also review normal changes.

The hook never edits project files. It tracks files touched by write tools and, at Stop,
blocks completion once when an independent `quality` review is required.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import sys
from typing import Any

COMPLEX = re.compile(
    r"(auth|authorization|permission|security|crypto|payment|billing|migration|schema|"
    r"database|infra|deploy|terraform|k8s|kubernetes|concurr|thread|lock|public[-_ ]?api|breaking)",
    re.I,
)
PATCH_FILE = re.compile(r"^\*\*\* (?:Update|Add|Delete) File:\s*(.+?)\s*$", re.M)


def state_root() -> Path:
    explicit = os.environ.get("XDG_STATE_HOME")
    base = Path(explicit).expanduser() if explicit else Path.home() / ".local" / "state"
    root = base / "opencode-delta" / "codex"
    root.mkdir(parents=True, exist_ok=True)
    return root


def session_key(data: dict[str, Any]) -> str:
    raw = str(data.get("session_id") or data.get("sessionId") or data.get("transcript_path") or data.get("cwd") or "default")
    return hashlib.sha256(raw.encode()).hexdigest()[:24]


def state_path(data: dict[str, Any]) -> Path:
    return state_root() / f"{session_key(data)}.json"


def load_state(data: dict[str, Any]) -> dict[str, Any]:
    path = state_path(data)
    try:
        return json.loads(path.read_text())
    except Exception:
        return {"files": [], "review_requested": False}


def save_state(data: dict[str, Any], state: dict[str, Any]) -> None:
    path = state_path(data)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2) + "\n")
    tmp.replace(path)


def cleanup(data: dict[str, Any]) -> None:
    try:
        state_path(data).unlink()
    except FileNotFoundError:
        pass


def collect_paths(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, dict):
        for key, child in value.items():
            lk = str(key).lower()
            if lk in {"file_path", "filepath", "path", "filename", "file"} and isinstance(child, str):
                found.add(child)
            elif lk in {"patch", "diff"} and isinstance(child, str):
                found.update(m.group(1).strip() for m in PATCH_FILE.finditer(child))
            else:
                found.update(collect_paths(child))
    elif isinstance(value, list):
        for child in value:
            found.update(collect_paths(child))
    return {p for p in found if p and "\x00" not in p}


def infer_risk(files: list[str]) -> str:
    if any(COMPLEX.search(path) for path in files):
        return "complex"
    if len(files) >= 9:
        return "complex"
    if len(files) <= 3:
        return "trivial"
    return "normal"


def emit(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0

    mode = os.environ.get("OPENCODE_DELTA_CODEX_QUALITY", "balanced").strip().lower()
    if mode not in {"off", "balanced", "strict"}:
        mode = "balanced"
    if mode == "off":
        cleanup(data)
        return 0

    event = str(data.get("event") or data.get("hook_event_name") or "")
    if event == "PostToolUse":
        state = load_state(data)
        paths = collect_paths(data.get("tool_input", {}))
        state["files"] = sorted(set(state.get("files", [])) | paths)
        save_state(data, state)
        return 0

    if event != "Stop":
        return 0

    state = load_state(data)
    files = [str(x) for x in state.get("files", []) if x]
    if not files:
        cleanup(data)
        return 0

    if bool(data.get("stop_hook_active")):
        cleanup(data)
        return 0

    risk = infer_risk(files)
    should_review = risk == "complex" or (mode == "strict" and risk == "normal")
    if not should_review:
        cleanup(data)
        return 0

    if state.get("review_requested"):
        cleanup(data)
        return 0

    state["review_requested"] = True
    state["risk"] = risk
    save_state(data, state)

    short_files = ", ".join(files[:12])
    if len(files) > 12:
        short_files += f", +{len(files) - 12} more"

    reason = (
        f"OpenCode Delta quality gate: this change is {risk} risk. Before completing, delegate an independent "
        f"review to the custom `quality` subagent. It must inspect the current diff, run proportional "
        f"deterministic checks, and invoke only relevant auditors. If it returns REJECT, apply only "
        f"the required in-scope corrections and verify again before the final answer. Changed files: {short_files}"
    )
    emit({"decision": "block", "reason": reason})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
