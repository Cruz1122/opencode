import { GlobalBus } from "@/bus/global"
import { Provider } from "@opencode-ai/schema/provider"
import { ProviderUsageEvent } from "@opencode-ai/schema/provider-usage-event"

export const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"
export const USAGE_POLL_MIN_INTERVAL_MS = 60_000
export const USAGE_POLL_TIMEOUT_MS = 10_000

export type Window = ProviderUsageEvent.Window
export type Credits = ProviderUsageEvent.Credits
export type Snapshot = ProviderUsageEvent.Snapshot

type UsageAuth = {
  access: string
  accountId: string
}

type State = {
  latest: Snapshot | undefined
  lastPollAt: number
  pollInflight: boolean
}

const state: State = {
  latest: undefined,
  lastPollAt: 0,
  pollInflight: false,
}

const providerID = Provider.ID.openai

export function getLatest(): Snapshot | undefined {
  return state.latest
}

export function clear() {
  state.latest = undefined
  state.lastPollAt = 0
  state.pollInflight = false
}

export function parseWindowFromUsageJson(win: unknown): Window | undefined {
  if (!win || typeof win !== "object") return undefined
  const record = win as Record<string, unknown>
  const used = Number(record.used_percent)
  if (!Number.isFinite(used)) return undefined

  const secs = record.limit_window_seconds
  const windowMinutes =
    typeof secs === "number" && secs > 0 ? Math.floor((secs + 59) / 60) : undefined
  const resetsAt = typeof record.reset_at === "number" ? record.reset_at : undefined

  return {
    usedPercent: used,
    ...(windowMinutes !== undefined && { windowMinutes }),
    ...(resetsAt !== undefined && { resetsAt }),
  }
}

export function parseUsagePayload(payload: unknown): Omit<Snapshot, "providerID" | "capturedAt"> | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const record = payload as Record<string, unknown>
  const rateLimit = record.rate_limit && typeof record.rate_limit === "object" ? (record.rate_limit as Record<string, unknown>) : {}
  const primary = parseWindowFromUsageJson(rateLimit.primary_window)
  const secondary = parseWindowFromUsageJson(rateLimit.secondary_window)

  let credits: Credits | undefined
  if (record.credits && typeof record.credits === "object") {
    const cred = record.credits as Record<string, unknown>
    if (typeof cred.has_credits === "boolean") {
      const hasCredits = cred.has_credits
      const balance = hasCredits && cred.balance != null && cred.balance !== "" ? String(cred.balance) : undefined
      credits = {
        hasCredits,
        unlimited: Boolean(cred.unlimited),
        ...(balance !== undefined && { balance }),
      }
    }
  }

  if (!primary && !secondary && !credits) return undefined

  return {
    ...(primary && { primary }),
    ...(secondary && { secondary }),
    ...(credits && { credits }),
  }
}

function headerMap(headers: Headers | Record<string, string>): Record<string, string> {
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((value, key) => {
      out[key.toLowerCase()] = value
    })
    return out
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    out[key.toLowerCase()] = value
  }
  return out
}

function parseFloatHeader(headers: Record<string, string>, name: string) {
  const raw = headers[name]
  if (raw === undefined) return undefined
  const value = Number.parseFloat(raw)
  return Number.isFinite(value) ? value : undefined
}

function parseIntHeader(headers: Record<string, string>, name: string) {
  const raw = headers[name]
  if (raw === undefined) return undefined
  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) ? value : undefined
}

function parseBoolHeader(headers: Record<string, string>, name: string) {
  const raw = headers[name]
  if (raw === undefined) return undefined
  if (raw.toLowerCase() === "true" || raw === "1") return true
  if (raw.toLowerCase() === "false" || raw === "0") return false
  return undefined
}

function parseHeaderWindow(headers: Record<string, string>, which: "primary" | "secondary"): Window | undefined {
  const usedPercent = parseFloatHeader(headers, `x-codex-${which}-used-percent`)
  if (usedPercent === undefined) return undefined
  const windowMinutes = parseIntHeader(headers, `x-codex-${which}-window-minutes`)
  const resetsAt = parseIntHeader(headers, `x-codex-${which}-reset-at`)
  return {
    usedPercent,
    ...(windowMinutes !== undefined && { windowMinutes }),
    ...(resetsAt !== undefined && { resetsAt }),
  }
}

export function parseRateLimitHeaders(headers: Headers | Record<string, string>): Omit<Snapshot, "providerID" | "capturedAt"> | undefined {
  const map = headerMap(headers)
  const primary = parseHeaderWindow(map, "primary")
  const secondary = parseHeaderWindow(map, "secondary")

  let credits: Credits | undefined
  const hasCredits = parseBoolHeader(map, "x-codex-credits-has-credits")
  if (hasCredits !== undefined) {
    const unlimited = parseBoolHeader(map, "x-codex-credits-unlimited") ?? false
    const balance = map["x-codex-credits-balance"]?.trim() || undefined
    credits = {
      hasCredits,
      unlimited,
      ...(balance !== undefined && { balance }),
    }
  }

  if (!primary && !secondary && !credits) return undefined

  return {
    ...(primary && { primary }),
    ...(secondary && { secondary }),
    ...(credits && { credits }),
  }
}

function store(partial: Omit<Snapshot, "providerID" | "capturedAt">) {
  const snapshot: Snapshot = {
    providerID,
    ...partial,
    capturedAt: Date.now(),
  }
  state.latest = snapshot
  GlobalBus.emit("event", {
    payload: {
      type: ProviderUsageEvent.Updated.type,
      properties: {
        providerID,
        usage: snapshot,
      },
    },
  })
  return snapshot
}

export function updateFromHeaders(headers: Headers | Record<string, string>) {
  const parsed = parseRateLimitHeaders(headers)
  if (!parsed) return undefined
  return store(parsed)
}

export function updateFromUsagePayload(payload: unknown) {
  const parsed = parseUsagePayload(payload)
  if (!parsed) return undefined
  return store(parsed)
}

function tryBeginPoll(minIntervalMs: number) {
  const now = Date.now()
  if (state.pollInflight) return false
  if (now - state.lastPollAt < minIntervalMs) return false
  state.pollInflight = true
  state.lastPollAt = now
  return true
}

function endPoll() {
  state.pollInflight = false
}

export async function fetchUsage(auth: UsageAuth, options?: { url?: string; timeoutMs?: number }) {
  const url = options?.url ?? CODEX_USAGE_URL
  const timeoutMs = options?.timeoutMs ?? USAGE_POLL_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${auth.access}`,
        "ChatGPT-Account-Id": auth.accountId,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    if (!response.ok) return undefined
    return updateFromUsagePayload(await response.json())
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

export function maybeScheduleUsagePoll(
  auth: { access?: string; accountId?: string },
  options?: { url?: string; minIntervalMs?: number; timeoutMs?: number },
) {
  if (!auth.access || !auth.accountId) return false
  const minIntervalMs = options?.minIntervalMs ?? USAGE_POLL_MIN_INTERVAL_MS
  if (!tryBeginPoll(minIntervalMs)) return false
  void fetchUsage(
    { access: auth.access, accountId: auth.accountId },
    { url: options?.url, timeoutMs: options?.timeoutMs },
  ).finally(endPoll)
  return true
}

export function formatWindowLabel(windowMinutes: number | undefined) {
  if (windowMinutes === undefined) return undefined
  if (windowMinutes < 60) return `${windowMinutes}m`
  if (windowMinutes % (24 * 60) === 0) return `${windowMinutes / (24 * 60)}d`
  if (windowMinutes % 60 === 0) return `${windowMinutes / 60}h`
  const hours = Math.floor(windowMinutes / 60)
  const mins = windowMinutes % 60
  return `${hours}h${String(mins).padStart(2, "0")}m`
}

export function formatWindow(window: Window | undefined) {
  if (!window) return undefined
  const label = formatWindowLabel(window.windowMinutes) ?? "?"
  return `${label} ${Math.round(window.usedPercent)}%`
}

export function formatSnapshot(snapshot: Snapshot | undefined) {
  if (!snapshot) return undefined
  return [formatWindow(snapshot.primary), formatWindow(snapshot.secondary), formatWindow(snapshot.tertiary)]
    .filter(Boolean)
    .join(" · ") || undefined
}

/** @internal test helpers */
export function __setStateForTest(next: Partial<State>) {
  Object.assign(state, next)
}

export function __getStateForTest() {
  return { ...state }
}
