import { spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"

export type ExecResult = {
  command: string
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

export async function exec(command: string, cwd: string, timeoutMs = 600_000): Promise<ExecResult> {
  const started = Date.now()
  const shell = process.env.SHELL?.includes("fish") ? process.env.SHELL : "fish"
  return await new Promise((resolve) => {
    const child = spawn(shell, ["-lc", command], { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => { stdout += String(chunk) })
    child.stderr.on("data", (chunk) => { stderr += String(chunk) })
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs)
    let timedOut = false
    timer.unref?.()
    child.on("exit", (code, signal) => {
      clearTimeout(timer)
      timedOut = signal === "SIGTERM" && Date.now() - started >= timeoutMs
      resolve({ command, exitCode: code, stdout, stderr, timedOut, durationMs: Date.now() - started })
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      resolve({ command, exitCode: null, stdout, stderr: `${stderr}\n${error.message}`.trim(), timedOut, durationMs: Date.now() - started })
    })
  })
}

export function within(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root)
  const resolved = path.resolve(resolvedRoot, candidate)
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Path escapes allowed root: ${candidate}`)
  }
  return resolved
}

export function stripJsonComments(input: string): string {
  let out = ""
  let inString = false
  let escape = false
  let lineComment = false
  let blockComment = false
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    const n = input[i + 1]
    if (lineComment) {
      if (c === "\n") { lineComment = false; out += c }
      continue
    }
    if (blockComment) {
      if (c === "*" && n === "/") { blockComment = false; i++ }
      continue
    }
    if (inString) {
      out += c
      if (escape) escape = false
      else if (c === "\\") escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') { inString = true; out += c; continue }
    if (c === "/" && n === "/") { lineComment = true; i++; continue }
    if (c === "/" && n === "*") { blockComment = true; i++; continue }
    out += c
  }
  return out.replace(/,\s*([}\]])/g, "$1")
}

export async function readJsonc(file: string): Promise<any> {
  return JSON.parse(stripJsonComments(await fs.readFile(file, "utf8")))
}

export function parseFrontmatter(text: string): { meta: Record<string, any>, body: string } {
  if (!text.startsWith("---\n")) return { meta: {}, body: text }
  const end = text.indexOf("\n---\n", 4)
  if (end < 0) return { meta: {}, body: text }
  const raw = text.slice(4, end)
  const meta: Record<string, any> = {}
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) continue
    const value = match[2].trim()
    if (value === "true" || value === "false") meta[match[1]] = value === "true"
    else meta[match[1]] = value.replace(/^['"]|['"]$/g, "")
  }
  return { meta, body: text.slice(end + 5) }
}

export async function walkMarkdown(root: string): Promise<string[]> {
  const result: string[] = []
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if ([".obsidian", "assets", "private"].includes(entry.name)) continue
        await walk(full)
      } else if (entry.isFile() && entry.name.endsWith(".md")) result.push(full)
    }
  }
  await walk(root)
  return result
}

export function truncate(text: string, max = 3000): string {
  return text.length <= max ? text : text.slice(0, max) + "\n…[truncated]"
}
