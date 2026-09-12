import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "node:fs"
import path from "node:path"
import { exec, readJsonc, truncate } from "../lib/common"

type Check = { name: string, command: string, required: boolean, source: string }

async function exists(file: string) { try { await fs.access(file); return true } catch { return false } }

async function detect(root: string, risk: string): Promise<Check[]> {
  const checks: Check[] = []
  const pkgFile = path.join(root, "package.json")
  if (await exists(pkgFile)) {
    const pkg = JSON.parse(await fs.readFile(pkgFile, "utf8"))
    const scripts = pkg.scripts ?? {}
    const pm = await exists(path.join(root, "pnpm-lock.yaml")) ? "pnpm" : await exists(path.join(root, "bun.lockb")) || await exists(path.join(root, "bun.lock")) ? "bun" : await exists(path.join(root, "yarn.lock")) ? "yarn" : "npm"
    const run = (name: string) => pm === "npm" ? `npm run ${name}` : `${pm} run ${name}`
    const add = (name: string, candidates: string[], required = true) => {
      const found = candidates.find((candidate) => scripts[candidate])
      if (found) checks.push({ name, command: run(found), required, source: "detected package.json script" })
    }
    add("format", ["format:check", "format-check", "check:format"], false)
    add("lint", ["lint", "check:lint"])
    add("typecheck", ["typecheck", "type-check", "check:types"])
    add("test", ["test", "test:unit"])
    if (risk !== "trivial") add("build", ["build"], risk === "complex")
  }
  if (await exists(path.join(root, "go.mod"))) {
    checks.push({ name: "format", command: "bash -lc 'test -z \"$(find . -type f -name \"*.go\" -not -path \"./vendor/*\" -print0 | xargs -0 -r gofmt -l)\"'", required: false, source: "detected Go module" })
    checks.push({ name: "vet", command: "go vet ./...", required: true, source: "detected Go module" })
    checks.push({ name: "test", command: "go test ./...", required: true, source: "detected Go module" })
    if (risk !== "trivial") checks.push({ name: "build", command: "go build ./...", required: risk === "complex", source: "detected Go module" })
  }
  if (await exists(path.join(root, "pyproject.toml"))) {
    const pyproject = await fs.readFile(path.join(root, "pyproject.toml"), "utf8")
    const prefix = await exists(path.join(root, "uv.lock")) ? "uv run " : await exists(path.join(root, "poetry.lock")) ? "poetry run " : await exists(path.join(root, "pdm.lock")) ? "pdm run " : ""
    if (pyproject.includes("ruff")) {
      checks.push({ name: "format", command: `${prefix}ruff format --check .`, required: false, source: "detected Ruff" })
      checks.push({ name: "lint", command: `${prefix}ruff check .`, required: true, source: "detected Ruff" })
    }
    if (pyproject.includes("pytest")) checks.push({ name: "test", command: `${prefix}pytest -q`, required: true, source: "detected pytest" })
    if (pyproject.includes("mypy")) checks.push({ name: "typecheck", command: `${prefix}mypy .`, required: true, source: "detected mypy" })
    if (pyproject.includes("pyright")) checks.push({ name: "typecheck", command: `${prefix}pyright`, required: true, source: "detected pyright" })
  }
  if (await exists(path.join(root, "pubspec.yaml"))) {
    const pubspec = await fs.readFile(path.join(root, "pubspec.yaml"), "utf8")
    const flutter = pubspec.includes("flutter:")
    checks.push({ name: "format", command: "dart format --output=none --set-exit-if-changed .", required: false, source: "detected Dart project" })
    checks.push({ name: "analyze", command: flutter ? "flutter analyze" : "dart analyze", required: true, source: "detected Dart project" })
    checks.push({ name: "test", command: flutter ? "flutter test" : "dart test", required: true, source: "detected Dart project" })
  }
  return checks
}

export default tool({
  description: "Detect and run the project's deterministic quality checks. Explicit .opencode/quality-gate.jsonc configuration takes priority.",
  args: {
    risk: tool.schema.enum(["trivial", "normal", "complex"]).default("normal"),
    execute: tool.schema.boolean().default(true),
    timeoutSeconds: tool.schema.number().int().min(1).max(3600).default(600),
  },
  async execute(args, context) {
    const root = context.worktree || context.directory
    const configFile = path.join(root, ".opencode", "quality-gate.jsonc")
    let checks: Check[] = []
    if (await exists(configFile)) {
      const config = await readJsonc(configFile)
      for (const [name, item] of Object.entries<any>(config.checks ?? {})) {
        if (!item?.command) continue
        const requiredFor = Array.isArray(item.requiredFor) ? item.requiredFor : []
        checks.push({ name, command: String(item.command), required: item.required === true || requiredFor.includes(args.risk), source: ".opencode/quality-gate.jsonc" })
      }
    } else checks = await detect(root, args.risk)

    if (!args.execute) return JSON.stringify({ status: "detected", risk: args.risk, checks }, null, 2)
    const results = []
    for (const check of checks) {
      const result = await exec(check.command, root, args.timeoutSeconds * 1000)
      results.push({
        name: check.name,
        command: check.command,
        required: check.required,
        source: check.source,
        status: result.exitCode === 0 ? "passed" : result.timedOut ? "timeout" : "failed",
        exitCode: result.exitCode,
        durationMs: result.durationMs,
        stdout: truncate(result.stdout),
        stderr: truncate(result.stderr),
      })
    }
    const blocking = results.some((r) => r.required && r.status !== "passed")
    return JSON.stringify({ status: blocking ? "failed" : "passed", risk: args.risk, blocking, checks: results, skipped: checks.length ? [] : ["No supported checks or quality-gate configuration detected"] }, null, 2)
  },
})
