import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { within } from "../lib/common"

const SECRET = /(api[_-]?key|secret|password|passwd|private[_-]?key|bearer\s+[a-z0-9._-]+|-----BEGIN [A-Z ]+ PRIVATE KEY-----)/i
const slug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "memory"
const yamlField = (key: string, items: string[]) => items.length ? `${key}:\n${items.map((item) => `  - ${JSON.stringify(item)}`).join("\n")}` : `${key}: []`

export default tool({
  description: "Create one evidence-backed memory candidate under brain/memory/candidates. Only the archivist agent may use it.",
  args: {
    title: tool.schema.string().min(3).max(160),
    type: tool.schema.string().min(2).max(60),
    summary: tool.schema.string().min(20).max(6000),
    evidence: tool.schema.array(tool.schema.string()).min(1).max(30),
    relatedFiles: tool.schema.array(tool.schema.string()).default([]),
    relatedNotes: tool.schema.array(tool.schema.string()).default([]),
    verification: tool.schema.array(tool.schema.string()).default([]),
    confidence: tool.schema.enum(["low", "medium", "high"]),
    implications: tool.schema.string().max(4000).optional(),
  },
  async execute(args, context) {
    if (context.agent !== "archivist") throw new Error("brain_write_candidate is restricted to the archivist agent")
    const combined = JSON.stringify(args)
    if (SECRET.test(combined)) throw new Error("Candidate rejected because it appears to contain secret material")
    const root = context.worktree || context.directory
    const dir = within(root, "brain/memory/candidates")
    await fs.mkdir(dir, { recursive: true })
    const date = new Date().toISOString().slice(0, 10)
    const base = `${date}-${slug(args.title)}`
    let file = path.join(dir, `${base}.md`)
    if (await fs.stat(file).then(() => true).catch(() => false)) file = path.join(dir, `${base}-${crypto.randomBytes(3).toString("hex")}.md`)
    const content = `---\ntype: ${JSON.stringify(args.type)}\nstatus: candidate\ncreated: ${date}\nsource_agent: archivist\nconfidence: ${args.confidence}\n${yamlField("evidence", args.evidence)}\n${yamlField("related_files", args.relatedFiles)}\n${yamlField("related_notes", args.relatedNotes)}\n${yamlField("verification", args.verification)}\n---\n\n# ${args.title}\n\n## Finding\n\n${args.summary.trim()}\n\n## Evidence\n\n${args.evidence.map((v) => `- ${v}`).join("\n")}\n${args.implications ? `\n## Implications\n\n${args.implications.trim()}\n` : ""}`
    const temp = `${file}.tmp-${process.pid}`
    await fs.writeFile(temp, content, { flag: "wx" })
    await fs.rename(temp, file)
    return JSON.stringify({ created: path.relative(root, file), status: "candidate" })
  },
})
