import type { Plugin } from "@opencode-ai/plugin"
import { promises as fs } from "node:fs"
import path from "node:path"

// Balanced by default:
// - trivial and normal work finishes after the implementer's proportional checks
// - only complex/high-risk work triggers automatic independent quality review
// Modes:
//   OPENCODE_DELTA_ORCHESTRATOR=off      disable automatic orchestration
//   OPENCODE_DELTA_ORCHESTRATOR=strict   also auto-review normal work

type Phase = "editing" | "quality" | "archivist" | "done" | "stopped"
type Risk = "trivial" | "normal" | "complex"
type State = {
  sessionID: string
  modified: boolean
  modifiedFiles: string[]
  originalAgent?: "agent" | "debug"
  risk?: Risk
  phase: Phase
  correctionCycles: number
  lastUpdated: string
}

const states = new Map<string, State>()
const now = () => new Date().toISOString()

const complexPathPattern = /(auth|authorization|permission|security|crypto|payment|billing|migration|schema|database|infra|deploy|terraform|k8s|kubernetes|concurr|thread|lock|public[-_ ]?api|breaking)/i

function inferRisk(files: string[]): Risk {
  if (files.some((file) => complexPathPattern.test(file))) return "complex"
  if (files.length >= 9) return "complex"
  if (files.length <= 3) return "trivial"
  return "normal"
}

function isCritical(files: string[], qualityText: string): boolean {
  return files.some((file) => complexPathPattern.test(file)) ||
    /(critical|high severity|data loss|breaking change|migration redesign|production dependency)/i.test(qualityText)
}

function textFromParts(parts: any[]): string {
  return (parts ?? []).filter((part) => part?.type === "text").map((part) => part.text ?? "").join("\n")
}

export const WorkflowOrchestrator: Plugin = async ({ client, worktree }) => {
  const mode = process.env.OPENCODE_DELTA_ORCHESTRATOR ?? "balanced"
  if (mode === "off") return {}

  const stateDir = path.join(worktree, ".opencode", ".workflow")
  await fs.mkdir(stateDir, { recursive: true }).catch(() => {})
  const exclude = path.join(worktree, ".git", "info", "exclude")

  try {
    const current = await fs.readFile(exclude, "utf8").catch(() => "")
    if (!current.split(/\r?\n/).includes("/.opencode/.workflow/")) {
      await fs.mkdir(path.dirname(exclude), { recursive: true })
      await fs.appendFile(exclude, `${current && !current.endsWith("\n") ? "\n" : ""}/.opencode/.workflow/\n`)
    }
  } catch {
    // Non-Git worktree or read-only metadata. The workflow remains fail-safe.
  }

  async function save(state: State) {
    state.lastUpdated = now()
    states.set(state.sessionID, state)
    await fs.writeFile(path.join(stateDir, `${state.sessionID}.json`), JSON.stringify(state, null, 2)).catch(() => {})
  }

  async function latest(sessionID: string) {
    const response: any = await client.session.messages({ path: { id: sessionID } })
    const messages = response?.data ?? response ?? []
    return messages[messages.length - 1]
  }

  async function changedFiles(): Promise<string[]> {
    const response: any = await client.file.status({})
    return (response?.data ?? response ?? []).map((item: any) => item.path).filter(Boolean)
  }

  async function promptAgent(sessionID: string, agent: string, text: string) {
    await client.session.prompt({
      path: { id: sessionID },
      body: { agent, parts: [{ type: "text", text }] } as any,
    })
  }

  return {
    "tool.execute.after": async (input: any, output: any) => {
      const sessionID = input?.sessionID
      if (!sessionID) return

      if (["write", "edit", "apply_patch"].includes(String(input?.tool ?? ""))) {
        const state = states.get(sessionID) ?? {
          sessionID,
          modified: false,
          modifiedFiles: [],
          phase: "editing" as Phase,
          correctionCycles: 0,
          lastUpdated: now(),
        }

        state.modified = true
        const candidate = output?.args?.filePath ?? output?.args?.path ?? output?.args?.file ?? input?.path
        if (typeof candidate === "string" && !state.modifiedFiles.includes(candidate)) state.modifiedFiles.push(candidate)
        if (state.phase === "done" || state.phase === "stopped") state.phase = "editing"
        await save(state)
      }
    },

    event: async ({ event }: any) => {
      try {
        if (event?.type !== "session.idle") return
        const sessionID = event?.properties?.sessionID ?? event?.properties?.id
        if (!sessionID) return

        const state = states.get(sessionID)
        if (!state?.modified) return

        const message = await latest(sessionID)
        const agent = message?.info?.agent ?? message?.agent
        const text = textFromParts(message?.parts)
        const files = state.modifiedFiles.length ? state.modifiedFiles : await changedFiles()

        if (["agent", "debug"].includes(agent) && state.phase === "editing") {
          state.originalAgent = agent
          state.risk = inferRisk(files)

          const shouldAutoReview = state.risk === "complex" || (mode === "strict" && state.risk === "normal")
          if (!shouldAutoReview) {
            state.phase = "done"
            await save(state)
            return
          }

          state.phase = "quality"
          await save(state)
          await promptAgent(
            sessionID,
            "quality",
            `Perform an independent final review now. Risk: ${state.risk}. Inspect the current diff and run proportional deterministic checks. Invoke auditors only when their specific surface is present; do not invoke irrelevant auditors. Return the required VERDICT line. Do not edit.`,
          )
          return
        }

        if (agent === "quality" && state.phase === "quality") {
          if (/VERDICT:\s*PASS/i.test(text)) {
            state.phase = "archivist"
            await save(state)
            await promptAgent(
              sessionID,
              "archivist",
              "Quality passed. Evaluate whether this work produced durable, evidence-backed project knowledge. Search for duplicates and create a candidate only when the strict memory policy is satisfied; otherwise return a no-op reason.",
            )
            return
          }

          if (/VERDICT:\s*REJECT/i.test(text)) {
            if (!state.originalAgent || state.correctionCycles >= 2 || isCritical(files, text)) {
              state.phase = "stopped"
              await save(state)
              return
            }

            state.correctionCycles += 1
            state.phase = "editing"
            await save(state)
            await promptAgent(
              sessionID,
              state.originalAgent,
              `Quality rejected this complex/high-risk implementation. Apply only the required in-scope corrections below, rerun deterministic verification, and do not introduce unrelated refactors. This is correction cycle ${state.correctionCycles} of 2.\n\n${text}`,
            )
            return
          }

          state.phase = "stopped"
          await save(state)
          return
        }

        if (agent === "archivist" && state.phase === "archivist") {
          state.phase = "done"
          await save(state)
        }
      } catch (error) {
        await client.app.log({
          body: {
            service: "workflow-orchestrator",
            level: "warn",
            message: `Fail-safe orchestration skipped: ${(error as Error).message}`,
          },
        }).catch(() => {})
      }
    },
  }
}
