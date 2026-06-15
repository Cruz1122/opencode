import type { AssistantMessage, Message } from "@opencode-ai/sdk/v2"
import { Locale } from "./locale"

export type AggregatedTokens = {
  input: number
  output: number
  reasoning: number
  cache: {
    read: number
    write: number
  }
}

export type TokenStats = {
  rate?: number
  total: number
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

export const TOKEN_ICON = {
  input: "↓",
  output: "↑",
  cache: "◈",
} as const

export function turnAssistants(messages: Message[], parentID: string) {
  return messages.filter(
    (message): message is AssistantMessage => message.role === "assistant" && message.parentID === parentID,
  )
}

export function aggregateTokens(assistants: AssistantMessage[]): AggregatedTokens {
  return assistants.reduce(
    (sum, message) => ({
      input: sum.input + message.tokens.input,
      output: sum.output + message.tokens.output,
      reasoning: sum.reasoning + message.tokens.reasoning,
      cache: {
        read: sum.cache.read + message.tokens.cache.read,
        write: sum.cache.write + message.tokens.cache.write,
      },
    }),
    { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  )
}

export function tokenTotal(tokens: AggregatedTokens) {
  return tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write
}

export function tokensPerSecond(output: number, durationMs: number) {
  if (durationMs <= 0 || output <= 0) return undefined
  const rate = output / (durationMs / 1000)
  return rate >= 100 ? Math.round(rate) : Math.round(rate * 10) / 10
}

export function buildTokenStats(tokens: AggregatedTokens, durationMs: number): TokenStats | undefined {
  const total = tokenTotal(tokens)
  if (total <= 0) return undefined

  return {
    rate: tokensPerSecond(tokens.output, durationMs),
    total,
    input: tokens.input,
    output: tokens.output,
    cacheRead: tokens.cache.read,
    cacheWrite: tokens.cache.write,
  }
}

export function formatTokenDetail(stats: TokenStats) {
  let detail = `${Locale.number(stats.total)} tokens ${TOKEN_ICON.input} ${Locale.number(stats.input)}, ${TOKEN_ICON.output} ${Locale.number(stats.output)}`
  if (stats.cacheRead > 0 || stats.cacheWrite > 0) {
    detail += `, ${TOKEN_ICON.cache} ${Locale.number(stats.cacheRead)}/${Locale.number(stats.cacheWrite)}`
  }
  return detail
}

export function formatTokenStats(tokens: AggregatedTokens, durationMs: number) {
  const stats = buildTokenStats(tokens, durationMs)
  if (!stats) return undefined

  const parts = [] as string[]
  if (stats.rate !== undefined) parts.push(`${stats.rate} T/s`)
  parts.push(formatTokenDetail(stats))
  return parts.join(" · ")
}
