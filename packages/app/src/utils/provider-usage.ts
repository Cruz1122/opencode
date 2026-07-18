import type { ProviderUsageSnapshot, ProviderUsageWindow } from "@opencode-ai/sdk/v2"

function windowLabel(windowMinutes: number | undefined) {
  if (windowMinutes === undefined) return undefined
  if (windowMinutes < 60) return `${windowMinutes}m`
  if (windowMinutes % (24 * 60) === 0) return `${windowMinutes / (24 * 60)}d`
  if (windowMinutes % 60 === 0) return `${windowMinutes / 60}h`
  const hours = Math.floor(windowMinutes / 60)
  const mins = windowMinutes % 60
  return `${hours}h${String(mins).padStart(2, "0")}m`
}

export function formatProviderUsageWindow(window: ProviderUsageWindow | undefined) {
  if (!window) return undefined
  const used =
    typeof window.usedPercent === "number" ? window.usedPercent : Number.parseFloat(String(window.usedPercent))
  if (!Number.isFinite(used)) return undefined
  const label = windowLabel(typeof window.windowMinutes === "number" ? window.windowMinutes : undefined) ?? "?"
  return `${label} ${Math.round(used)}%`
}

export function formatProviderUsage(snapshot: ProviderUsageSnapshot | undefined) {
  if (!snapshot) return undefined
  return [
    formatProviderUsageWindow(snapshot.primary),
    formatProviderUsageWindow(snapshot.secondary),
    formatProviderUsageWindow(snapshot.tertiary),
  ]
    .filter(Boolean)
    .join(" · ") || undefined
}
