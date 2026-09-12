import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "node:fs"
import path from "node:path"
import { parseFrontmatter, walkMarkdown, truncate } from "../lib/common"

function score(text: string, terms: string[]) {
  const lower = text.toLowerCase()
  return terms.reduce((total, term) => total + (lower.includes(term) ? 3 : 0) + (lower.split(term).length - 1), 0)
}

export default tool({
  description: "Search the local project brain and return small authority-aware excerpts. Candidates are excluded by default.",
  args: {
    query: tool.schema.string().min(1),
    includeCandidates: tool.schema.boolean().default(false),
    includeObsolete: tool.schema.boolean().default(false),
    limit: tool.schema.number().int().min(1).max(20).default(8),
  },
  async execute(args, context) {
    const root = context.worktree || context.directory
    const brain = path.join(root, "brain")
    try { await fs.access(brain) } catch { return JSON.stringify({ results: [], note: "No brain/ directory exists" }) }
    const terms = args.query.toLowerCase().split(/\s+/).filter(Boolean)
    const ranked = []
    for (const file of await walkMarkdown(brain)) {
      const relative = path.relative(root, file)
      if (!args.includeCandidates && relative.includes("brain/memory/candidates/")) continue
      if (!args.includeObsolete && (relative.includes("/obsolete/") || relative.includes("/superseded/"))) continue
      const text = await fs.readFile(file, "utf8")
      const parsed = parseFrontmatter(text)
      const s = score(`${relative}\n${text}`, terms)
      if (s <= 0) continue
      const status = String(parsed.meta.status ?? (relative.includes("/accepted/") ? "accepted" : relative.includes("/verified/") ? "verified" : relative.includes("/candidates/") ? "candidate" : "unspecified"))
      const authority = status === "accepted" ? 5 : status === "verified" ? 4 : status === "inferred" ? 2 : status === "candidate" ? 1 : 3
      const excerptIndex = Math.max(0, parsed.body.toLowerCase().search(new RegExp(terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"))))
      const excerpt = parsed.body.slice(Math.max(0, excerptIndex - 120), excerptIndex + 520).trim()
      ranked.push({ path: relative, status, authority, score: s + authority * 2, excerpt: truncate(excerpt, 700) })
    }
    ranked.sort((a, b) => b.score - a.score)
    return JSON.stringify({ query: args.query, results: ranked.slice(0, args.limit) }, null, 2)
  },
})
