import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "node:fs"
import path from "node:path"
import { exec, within } from "../lib/common"

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "diagram"

export default tool({
  description: "Render Mermaid source into a local brain/assets/diagrams SVG or PNG without overwriting the source.",
  args: {
    sourcePath: tool.schema.string().optional(),
    sourceText: tool.schema.string().optional(),
    outputName: tool.schema.string().default("diagram"),
    format: tool.schema.enum(["svg", "png"]).default("svg"),
    theme: tool.schema.enum(["default", "neutral", "dark", "forest"]).default("default"),
  },
  async execute(args, context) {
    if (!args.sourcePath && !args.sourceText) throw new Error("Provide sourcePath or sourceText")
    const root = context.worktree || context.directory
    const brain = within(root, "brain")
    await fs.mkdir(path.join(brain, "architecture", "diagrams"), { recursive: true })
    const outputDir = path.join(brain, "assets", "diagrams")
    await fs.mkdir(outputDir, { recursive: true })
    let input: string
    let temporary = false
    if (args.sourcePath) {
      input = within(brain, path.relative("brain", args.sourcePath.startsWith("brain/") ? args.sourcePath : `brain/${args.sourcePath}`))
      if (!input.endsWith(".mmd") && !input.endsWith(".mermaid")) throw new Error("Source must be .mmd or .mermaid")
    } else {
      input = path.join(brain, "architecture", "diagrams", `.${slug(args.outputName)}-${process.pid}.mmd`)
      await fs.writeFile(input, args.sourceText!, "utf8")
      temporary = true
    }
    const output = path.join(outputDir, `${slug(args.outputName)}.${args.format}`)
    const configRoot = path.resolve(import.meta.dir, "..")
    const binary = path.join(configRoot, "node_modules", ".bin", "mmdc")
    try {
      await fs.access(binary)
    } catch {
      if (temporary) await fs.unlink(input).catch(() => {})
      return JSON.stringify({ status: "dependency-missing", message: "Mermaid CLI is not installed. Run bun install in ~/.config/opencode or restart OpenCode to install package.json dependencies." })
    }
    const command = `${JSON.stringify(binary)} -i ${JSON.stringify(input)} -o ${JSON.stringify(output)} -t ${args.theme}`
    const result = await exec(command, root, 180_000)
    if (temporary) await fs.unlink(input).catch(() => {})
    if (result.exitCode !== 0) return JSON.stringify({ status: "failed", stderr: result.stderr, stdout: result.stdout })
    return JSON.stringify({ status: "rendered", output: path.relative(root, output), source: args.sourcePath ?? "inline" })
  },
})
