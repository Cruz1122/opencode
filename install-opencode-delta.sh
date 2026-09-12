#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
TARGET="opencode"
BUILD_OPENCODE=1

usage() {
  cat <<'EOF'
OpenCode Delta installer

Usage:
  ./install-opencode-delta.sh                 Install the custom OpenCode build + suite.
  ./install-opencode-delta.sh --codex         Install OpenCode plus the Codex/ChatGPT adapter.
  ./install-opencode-delta.sh --target codex  Install only the Codex/ChatGPT adapter.
  ./install-opencode-delta.sh --target all    Install both.
  ./install-opencode-delta.sh --no-build      Refresh configuration without rebuilding OpenCode.

Notes:
  - No system package manager is invoked.
  - Existing managed files are backed up before replacement.
  - Codex hooks remain subject to Codex's own trust/approval controls.
EOF
}

while (($#)); do
  case "$1" in
    --codex) TARGET="all" ;;
    --target)
      shift
      TARGET="${1:-}"
      [[ "$TARGET" =~ ^(opencode|codex|all)$ ]] || { echo "Invalid --target: $TARGET" >&2; exit 2; }
      ;;
    --no-build) BUILD_OPENCODE=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
BACKUP_ROOT="$STATE_HOME/opencode-delta/backups/$(date +%Y%m%d-%H%M%S)"
INSTALL_STATE="$STATE_HOME/opencode-delta/install.json"
mkdir -p "$BACKUP_ROOT" "$(dirname "$INSTALL_STATE")"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: required command '$1' was not found." >&2
    exit 1
  }
}

backup() {
  local path="$1"
  [[ -e "$path" || -L "$path" ]] || return 0
  local rel="${path#$HOME/}"
  local dst="$BACKUP_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"
  cp -a "$path" "$dst"
}

copy_dir() {
  local src="$1" dst="$2"
  mkdir -p "$dst"
  cp -a "$src"/. "$dst"/
}

replace_managed_block() {
  local source="$1" target="$2" label="$3"
  mkdir -p "$(dirname "$target")"
  backup "$target"
  python3 - "$source" "$target" "$label" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1])
target = Path(sys.argv[2])
label = sys.argv[3]
begin = f"<!-- BEGIN {label} -->"
end = f"<!-- END {label} -->"
managed = source.read_text().rstrip()
block = f"{begin}\n{managed}\n{end}\n"

current = target.read_text() if target.exists() else ""
if begin in current and end in current:
    before, rest = current.split(begin, 1)
    _, after = rest.split(end, 1)
    result = before.rstrip() + "\n\n" + block + after.lstrip("\n")
else:
    result = current.rstrip()
    if result:
        result += "\n\n"
    result += block

target.write_text(result)
PY
}

merge_json() {
  local existing="$1" overlay="$2"
  python3 - "$existing" "$overlay" <<'PY'
from pathlib import Path
import json, sys

existing = Path(sys.argv[1])
overlay = Path(sys.argv[2])

def load(path):
    if not path.exists():
        return {}
    return json.loads(path.read_text())

def merge(a, b):
    if isinstance(a, dict) and isinstance(b, dict):
        out = dict(a)
        for k, v in b.items():
            out[k] = merge(out[k], v) if k in out else v
        return out
    return b

payload = merge(load(existing), load(overlay))
existing.parent.mkdir(parents=True, exist_ok=True)
existing.write_text(json.dumps(payload, indent=2) + "\n")
PY
}

install_opencode_config() {
  need python3
  need bun

  local src="$ROOT_DIR/suite/opencode"
  local dst="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  mkdir -p "$dst"

  echo "==> Backing up managed OpenCode paths"
  for path in \
    "$dst/opencode.json" "$dst/AGENTS.md" "$dst/package.json" \
    "$dst/agents" "$dst/instructions" "$dst/plugins" "$dst/tools" \
    "$dst/lib" "$dst/brain-templates" "$dst/cursor" "$dst/bin" "$dst/skills"
  do
    backup "$path"
  done

  echo "==> Installing OpenCode configuration"
  merge_json "$dst/opencode.json" "$src/opencode.json"
  replace_managed_block "$src/AGENTS.md" "$dst/AGENTS.md" "OPENCODE DELTA"

  for dir in agents instructions plugins tools lib brain-templates cursor bin; do
    mkdir -p "$dst/$dir"
    cp -a "$src/$dir"/. "$dst/$dir"/
  done

  cp "$src/package.json" "$dst/package.json"

  # Shared skills have one canonical source in the Codex plugin bundle.
  rm -rf "$dst/skills"
  mkdir -p "$dst/skills"
  cp -a "$ROOT_DIR/plugins/opencode-delta/skills"/. "$dst/skills"/

  echo "==> Resolving OpenCode suite dependencies with Bun"
  (
    cd "$dst"
    bun install
  )
}

build_opencode() {
  [[ "$BUILD_OPENCODE" -eq 1 ]] || {
    echo "==> Skipping OpenCode binary rebuild (--no-build)"
    return 0
  }

  need bun
  need install

  echo "==> Installing repository dependencies"
  (
    cd "$ROOT_DIR"
    bun install --frozen-lockfile
  )

  echo "==> Building the current-platform OpenCode binary"
  (
    cd "$ROOT_DIR"
    bun run --cwd packages/opencode build --single
  )

  local os arch
  case "$(uname -s)" in
    Linux) os="linux" ;;
    Darwin) os="darwin" ;;
    *) echo "ERROR: automatic custom OpenCode installation currently supports Linux/macOS." >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) echo "ERROR: unsupported architecture: $(uname -m)" >&2; exit 1 ;;
  esac

  local built="$ROOT_DIR/packages/opencode/dist/opencode-${os}-${arch}/bin/opencode"
  [[ -x "$built" ]] || { echo "ERROR: build completed but binary was not found at $built" >&2; exit 1; }

  local bindir="${OPENCODE_INSTALL_DIR:-$HOME/.local/bin}"
  local target="$bindir/opencode"
  mkdir -p "$bindir"
  backup "$target"
  install -m 0755 "$built" "$target"
  echo "==> Installed custom OpenCode: $target"
}

install_codex_adapter() {
  need python3

  local codex_home="${CODEX_HOME:-$HOME/.codex}"
  local agents_home="$HOME/.agents"
  local personal_plugins="$HOME/plugins"
  mkdir -p "$codex_home/agents" "$agents_home/skills" "$agents_home/plugins" "$personal_plugins"

  echo "==> Backing up managed Codex paths"
  backup "$codex_home/AGENTS.md"
  backup "$codex_home/agents"
  backup "$agents_home/skills"
  backup "$agents_home/plugins/marketplace.json"
  backup "$personal_plugins/opencode-delta"

  echo "==> Installing Codex global instructions and custom subagents"
  replace_managed_block "$ROOT_DIR/suite/codex/AGENTS.md" "$codex_home/AGENTS.md" "OPENCODE DELTA"
  cp -a "$ROOT_DIR/suite/codex/agents"/. "$codex_home/agents"/

  echo "==> Installing shared standalone skills"
  cp -a "$ROOT_DIR/plugins/opencode-delta/skills"/. "$agents_home/skills"/

  echo "==> Installing the native Codex plugin source"
  rm -rf "$personal_plugins/opencode-delta"
  cp -a "$ROOT_DIR/plugins/opencode-delta" "$personal_plugins/opencode-delta"

  echo "==> Registering OpenCode Delta in the personal plugin marketplace"
  python3 - "$agents_home/plugins/marketplace.json" <<'PY'
from pathlib import Path
import json, sys

path = Path(sys.argv[1])
payload = {}
if path.exists():
    try:
        payload = json.loads(path.read_text())
    except Exception as exc:
        raise SystemExit(f"Refusing to overwrite invalid marketplace JSON: {exc}")

if not payload:
    payload = {"name": "personal", "interface": {"displayName": "Personal"}, "plugins": []}

plugins = payload.setdefault("plugins", [])
entry = {
    "name": "opencode-delta",
    "source": {"source": "local", "path": "./plugins/opencode-delta"},
    "policy": {"installation": "INSTALLED_BY_DEFAULT", "authentication": "ON_USE"},
    "category": "Developer Tools",
}
for i, item in enumerate(plugins):
    if isinstance(item, dict) and item.get("name") == entry["name"]:
        plugins[i] = entry
        break
else:
    plugins.append(entry)

path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(payload, indent=2) + "\n")
PY

  if command -v codex >/dev/null 2>&1; then
    echo "==> Codex CLI detected; registering the repository marketplace too"
    # These commands are idempotent enough for refreshes: failures commonly mean already-added/already-installed.
    codex plugin marketplace add "$ROOT_DIR" >/dev/null 2>&1 || true
    codex plugin add opencode-delta@opencode-delta >/dev/null 2>&1 || true
  else
    echo "==> Codex CLI not found; personal plugin files were installed for ChatGPT/Codex discovery."
  fi

  cat <<'EOF'
==> Codex adapter installed.
    Codex may ask you to trust local hooks. Review and approve the OpenCode Delta hook when prompted;
    this installer intentionally does not bypass Codex hook trust.
EOF
}

case "$TARGET" in
  opencode)
    install_opencode_config
    build_opencode
    ;;
  codex)
    install_codex_adapter
    ;;
  all)
    install_opencode_config
    build_opencode
    install_codex_adapter
    ;;
esac

python3 - "$INSTALL_STATE" "$TARGET" "$ROOT_DIR" <<'PY'
from pathlib import Path
import datetime, json, sys
path = Path(sys.argv[1])
payload = {
    "installed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "target": sys.argv[2],
    "source": sys.argv[3],
}
path.write_text(json.dumps(payload, indent=2) + "\n")
PY

echo
echo "OpenCode Delta installation complete."
echo "Backups: $BACKUP_ROOT"
