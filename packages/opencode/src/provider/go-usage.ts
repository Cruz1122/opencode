import { GlobalBus } from "@/bus/global"
import { Provider } from "@opencode-ai/schema/provider"
import { ProviderUsageEvent } from "@opencode-ai/schema/provider-usage-event"

export const GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage"
export const USAGE_POLL_MIN_INTERVAL_MS = 60_000
export const USAGE_POLL_TIMEOUT_MS = 10_000

export type Window = ProviderUsageEvent.Window
export type Snapshot = ProviderUsageEvent.Snapshot
export type LimitName = "5 hour" | "weekly" | "monthly"

type AnalyzedUsage = {
  usagePercent?: number
  resetInSec?: number
  status?: string
}

type State = {
  latest: Snapshot | undefined
  lastPollAt: number
  pollInflight: boolean
  lastError: string | undefined
}

const state: State = {
  latest: undefined,
  lastPollAt: 0,
  pollInflight: false,
  lastError: undefined,
}

const providerID = Provider.ID.opencodeGo

export function getLatest(): Snapshot | undefined {
  return state.latest
}

export function clear() {
  state.latest = undefined
  state.lastPollAt = 0
  state.pollInflight = false
  state.lastError = undefined
}

function windowFromAnalyzed(input: AnalyzedUsage | undefined, windowMinutes: number): Window | undefined {
  if (!input || typeof input.usagePercent !== "number" || !Number.isFinite(input.usagePercent)) return undefined
  const resetsAt =
    typeof input.resetInSec === "number" && Number.isFinite(input.resetInSec)
      ? Math.floor(Date.now() / 1000) + Math.max(0, Math.floor(input.resetInSec))
      : undefined
  return {
    usedPercent: input.usagePercent,
    windowMinutes,
    ...(resetsAt !== undefined && { resetsAt }),
  }
}

function emptyWindow(windowMinutes: number, usedPercent: number, resetInSec?: number): Window {
  const resetsAt =
    resetInSec === undefined ? undefined : Math.floor(Date.now() / 1000) + Math.max(0, Math.floor(resetInSec))
  return {
    usedPercent,
    windowMinutes,
    ...(resetsAt !== undefined && { resetsAt }),
  }
}

export function parseGoUsagePayload(payload: unknown): Omit<Snapshot, "providerID" | "capturedAt"> | undefined {
  if (!payload || typeof payload !== "object") return undefined
  const record = payload as Record<string, unknown>

  const rolling =
    record.rollingUsage && typeof record.rollingUsage === "object" ? (record.rollingUsage as AnalyzedUsage) : undefined
  const weekly =
    record.weeklyUsage && typeof record.weeklyUsage === "object" ? (record.weeklyUsage as AnalyzedUsage) : undefined
  const monthly =
    record.monthlyUsage && typeof record.monthlyUsage === "object" ? (record.monthlyUsage as AnalyzedUsage) : undefined

  const primary = windowFromAnalyzed(rolling, 5 * 60)
  const secondary = windowFromAnalyzed(weekly, 7 * 24 * 60)
  const tertiary = windowFromAnalyzed(monthly, 30 * 24 * 60)

  if (!primary && !secondary && !tertiary) return undefined

  return {
    ...(primary && { primary }),
    ...(secondary && { secondary }),
    ...(tertiary && { tertiary }),
  }
}

function store(partial: Omit<Snapshot, "providerID" | "capturedAt">) {
  const snapshot: Snapshot = {
    providerID,
    ...partial,
    capturedAt: Date.now(),
  }
  state.latest = snapshot
  state.lastError = undefined
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

export function updateFromUsagePayload(payload: unknown) {
  const parsed = parseGoUsagePayload(payload)
  if (!parsed) return undefined
  return store(parsed)
}

/** Mark a Go plan window as exhausted from a live GoUsageLimitError. */
export function applyLimitReached(limitName: LimitName | string | undefined, resetInSec?: number) {
  const current = state.latest
  const primary = current?.primary ?? emptyWindow(5 * 60, 0)
  const secondary = current?.secondary ?? emptyWindow(7 * 24 * 60, 0)

  const hit = (windowMinutes: number) => emptyWindow(windowMinutes, 100, resetInSec)

  if (limitName === "weekly") {
    return store({
      primary,
      secondary: hit(7 * 24 * 60),
      ...(current?.tertiary && { tertiary: current.tertiary }),
    })
  }
  if (limitName === "monthly") {
    return store({
      primary,
      secondary,
      tertiary: hit(30 * 24 * 60),
    })
  }
  return store({
    primary: hit(5 * 60),
    secondary,
    ...(current?.tertiary && { tertiary: current.tertiary }),
  })
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

export async function fetchUsage(apiKey: string, options?: { url?: string; timeoutMs?: number }) {
  const url = options?.url ?? GO_USAGE_URL
  const timeoutMs = options?.timeoutMs ?? USAGE_POLL_TIMEOUT_MS
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      state.lastError = `Go usage HTTP ${response.status}`
      return undefined
    }
    return updateFromUsagePayload(await response.json())
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : "Go usage fetch failed"
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

export function maybeScheduleUsagePoll(
  apiKey: string | undefined,
  options?: { url?: string; minIntervalMs?: number; timeoutMs?: number },
) {
  if (!apiKey) return false
  const minIntervalMs = options?.minIntervalMs ?? USAGE_POLL_MIN_INTERVAL_MS
  if (!tryBeginPoll(minIntervalMs)) return false
  void fetchUsage(apiKey, { url: options?.url, timeoutMs: options?.timeoutMs }).finally(endPoll)
  return true
}

export async function refreshUsage(
  apiKey: string | undefined,
  options?: { url?: string; minIntervalMs?: number; timeoutMs?: number; force?: boolean },
) {
  if (!apiKey) return getLatest()
  const minIntervalMs = options?.force ? 0 : (options?.minIntervalMs ?? USAGE_POLL_MIN_INTERVAL_MS)
  if (!tryBeginPoll(minIntervalMs)) return getLatest()
  try {
    return (await fetchUsage(apiKey, { url: options?.url, timeoutMs: options?.timeoutMs })) ?? getLatest()
  } finally {
    endPoll()
  }
}

/** @internal test helpers */
export function __setStateForTest(next: Partial<State>) {
  Object.assign(state, next)
}

export function __getStateForTest() {
  return { ...state }
}
