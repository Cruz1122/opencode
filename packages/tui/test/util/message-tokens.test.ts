import { describe, expect, test } from "bun:test"
import type { AssistantMessage, Message } from "@opencode-ai/sdk/v2"
import {
  aggregateTokens,
  buildTokenStats,
  formatTokenDetail,
  formatTokenStats,
  tokenTotal,
  tokensPerSecond,
  turnAssistants,
} from "../../src/util/message-tokens"

const assistant = (input: {
  id: string
  parentID: string
  tokens?: AssistantMessage["tokens"]
  finish?: string
}): AssistantMessage => ({
  id: input.id,
  sessionID: "ses_1",
  role: "assistant",
  parentID: input.parentID,
  providerID: "anthropic",
  modelID: "claude-sonnet",
  mode: "build",
  agent: "build",
  path: { cwd: "/", root: "/" },
  cost: 0,
  tokens: input.tokens ?? { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  time: { created: 0, completed: 1000 },
  finish: input.finish,
})

describe("message-tokens", () => {
  test("turnAssistants filters by parentID", () => {
    const messages: Message[] = [
      {
        id: "user_1",
        sessionID: "ses_1",
        role: "user",
        time: { created: 0 },
        agent: "build",
        model: { providerID: "anthropic", modelID: "claude-sonnet" },
      },
      assistant({ id: "asst_1", parentID: "user_1", tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 0, write: 0 } } }),
      assistant({ id: "asst_2", parentID: "user_1", tokens: { input: 50, output: 30, reasoning: 5, cache: { read: 10, write: 5 } } }),
      assistant({ id: "asst_3", parentID: "user_2", tokens: { input: 999, output: 999, reasoning: 0, cache: { read: 0, write: 0 } } }),
    ]

    expect(turnAssistants(messages, "user_1")).toHaveLength(2)
  })

  test("aggregateTokens sums multi-step turn usage", () => {
    const messages = [
      assistant({
        id: "asst_1",
        parentID: "user_1",
        tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 50, write: 10 } },
      }),
      assistant({
        id: "asst_2",
        parentID: "user_1",
        tokens: { input: 200, output: 80, reasoning: 5, cache: { read: 20, write: 15 } },
      }),
    ]

    expect(aggregateTokens(messages)).toEqual({
      input: 300,
      output: 100,
      reasoning: 5,
      cache: { read: 70, write: 25 },
    })
    expect(tokenTotal(aggregateTokens(messages))).toBe(500)
  })

  test("tokensPerSecond returns undefined for invalid input", () => {
    expect(tokensPerSecond(0, 1000)).toBeUndefined()
    expect(tokensPerSecond(10, 0)).toBeUndefined()
  })

  test("tokensPerSecond rounds fast rates to integers", () => {
    expect(tokensPerSecond(100, 2000)).toBe(50)
  })

  test("tokensPerSecond keeps one decimal for slower rates", () => {
    expect(tokensPerSecond(15, 2000)).toBe(7.5)
  })

  test("formatTokenDetail uses icons and cache read/write", () => {
    const stats = buildTokenStats(
      { input: 6000, output: 1500, reasoning: 0, cache: { read: 400, write: 100 } },
      10_000,
    )!
    expect(formatTokenDetail(stats)).toBe("8.0K tokens ↓ 6.0K, ↑ 1.5K, ◈ 400/100")
  })

  test("formatTokenDetail omits cache when both are zero", () => {
    const stats = buildTokenStats(
      { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } },
      5000,
    )!
    expect(formatTokenDetail(stats)).toBe("150 tokens ↓ 100, ↑ 50")
  })

  test("formatTokenStats includes rate and token detail", () => {
    const stats = formatTokenStats(
      { input: 6000, output: 1500, reasoning: 0, cache: { read: 400, write: 100 } },
      10_000,
    )
    expect(stats).toBe("150 T/s · 8.0K tokens ↓ 6.0K, ↑ 1.5K, ◈ 400/100")
  })

  test("buildTokenStats returns undefined when total is zero", () => {
    expect(
      buildTokenStats({ input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }, 1000),
    ).toBeUndefined()
  })
})
