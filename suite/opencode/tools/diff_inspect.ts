import { tool } from "@opencode-ai/plugin"
import { exec, truncate } from "../lib/common"

function category(file: string) {
  if (/test|spec|__tests__/i.test(file)) return "test"
  if (/migration|schema|prisma/i.test(file)) return "migration"
  if (/\.md$|docs\//i.test(file)) return "documentation"
  if (/lock|package\.json|go\.mod|pyproject|Dockerfile|compose|\.ya?ml$/i.test(file)) return "configuration"
  if (/generated|\.gen\.|dist\//i.test(file)) return "generated"
  return "implementation"
}

export default tool({
  description: "Inspect Git status and diffs without changing staging, and suggest conservative logical commit groups.",
  args: {
    includePatch: tool.schema.boolean().default(false),
  },
  async execute(args, context) {
    const root = context.worktree || context.directory
    const inside = await exec("git rev-parse --is-inside-work-tree", root, 10_000)
    if (inside.exitCode !== 0) return JSON.stringify({ error: "Not a Git worktree" })
    const status = await exec("git status --porcelain=v1", root, 20_000)
    const nameStatus = await exec("git diff --name-status; git diff --staged --name-status", root, 30_000)
    const stat = await exec("git diff --stat; git diff --staged --stat", root, 30_000)
    const patch = args.includePatch ? await exec("git diff; git diff --staged", root, 60_000) : null
    const files = status.stdout.split("\n").filter(Boolean).map((line) => {
      const code = line.slice(0, 2)
      const file = line.slice(3).replace(/^"|"$/g, "")
      return { path: file, status: code, category: category(file), staged: code[0] !== " " && code[0] !== "?", unstaged: code[1] !== " " || code === "??" }
    })
    const groups = new Map<string, string[]>()
    for (const file of files) {
      const key = file.category === "test" ? "test" : file.category === "documentation" ? "docs" : file.category === "migration" ? "migration" : "change"
      groups.set(key, [...(groups.get(key) ?? []), file.path])
    }
    const suggestedCommits = [...groups].map(([key, paths]) => ({
      message: key === "docs" ? "docs: update project documentation" : key === "test" ? "test: update behavior coverage" : key === "migration" ? "chore(db): update schema migration" : "chore: group related implementation changes",
      files: paths,
      note: "Suggestion only; verify semantic cohesion before staging",
    }))
    return JSON.stringify({ worktreeClean: files.length === 0, files, nameStatus: nameStatus.stdout, stat: stat.stdout, suggestedCommits, patch: patch ? truncate(patch.stdout, 20_000) : undefined }, null, 2)
  },
})
