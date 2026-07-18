import { afterEach, describe, expect, mock, test } from "bun:test"
import { Provider } from "@opencode-ai/schema/provider"
import {
  __getStateForTest,
  __setStateForTest,
  clear,
  formatSnapshot,
  formatWindowLabel,
  maybeScheduleUsagePoll,
  parseRateLimitHeaders,
  parseUsagePayload,
  updateFromHeaders,
  updateFromUsagePayload,
  USAGE_POLL_MIN_INTERVAL_MS,
} from "../../src/plugin/openai/codex-usage"

afterEach(() => {
  clear()
  mock.restore()
})

describe("codex-usage", () => {
  test("parses /wham/usage payload windows and credits", () => {
    const parsed = parseUsagePayload({
      rate_limit: {
        primary_window: {
          used_percent: 42.5,
          limit_window_seconds: 18_000,
          reset_at: 1_700_000_000,
        },
        secondary_window: {
          used_percent: 18,
          limit_window_seconds: 604_800,
          reset_at: 1_700_500_000,
        },
      },
      credits: {
        has_credits: true,
        unlimited: false,
        balance: "$5.00",
      },
    })

    expect(parsed).toEqual({
      primary: {
        usedPercent: 42.5,
        windowMinutes: 300,
        resetsAt: 1_700_000_000,
      },
      secondary: {
        usedPercent: 18,
        windowMinutes: 10_080,
        resetsAt: 1_700_500_000,
      },
      credits: {
        hasCredits: true,
        unlimited: false,
        balance: "$5.00",
      },
    })
  })

  test("returns undefined when usage payload has no rate-limit data", () => {
    expect(parseUsagePayload({})).toBeUndefined()
    expect(parseUsagePayload({ rate_limit: {} })).toBeUndefined()
    expect(parseUsagePayload(null)).toBeUndefined()
  })

  test("parses x-codex-* response headers", () => {
    const parsed = parseRateLimitHeaders({
      "x-codex-primary-used-percent": "12.5",
      "x-codex-primary-window-minutes": "300",
      "x-codex-primary-reset-at": "1704069000",
      "x-codex-secondary-used-percent": "80",
      "x-codex-secondary-window-minutes": "10080",
      "x-codex-secondary-reset-at": "1704074400",
      "x-codex-credits-has-credits": "false",
      "x-codex-credits-unlimited": "false",
    })

    expect(parsed).toEqual({
      primary: {
        usedPercent: 12.5,
        windowMinutes: 300,
        resetsAt: 1_704_069_000,
      },
      secondary: {
        usedPercent: 80,
        windowMinutes: 10_080,
        resetsAt: 1_704_074_400,
      },
      credits: {
        hasCredits: false,
        unlimited: false,
      },
    })
  })

  test("updateFromHeaders stores snapshot and formats labels", () => {
    const snapshot = updateFromHeaders({
      "x-codex-primary-used-percent": "42",
      "x-codex-primary-window-minutes": "300",
      "x-codex-secondary-used-percent": "18",
      "x-codex-secondary-window-minutes": "10080",
    })

    expect(snapshot?.providerID).toBe(Provider.ID.openai)
    expect(formatWindowLabel(300)).toBe("5h")
    expect(formatWindowLabel(10_080)).toBe("7d")
    expect(formatSnapshot(snapshot)).toBe("5h 42% · 7d 18%")
  })

  test("updateFromUsagePayload stores snapshot", () => {
    const snapshot = updateFromUsagePayload({
      rate_limit: {
        primary_window: { used_percent: 10, limit_window_seconds: 300 },
      },
    })
    expect(snapshot?.primary?.usedPercent).toBe(10)
    expect(snapshot?.primary?.windowMinutes).toBe(5)
    expect(__getStateForTest().latest).toEqual(snapshot)
  })

  test("does not schedule usage poll without oauth account id", () => {
    const fetchMock = mock(() => Promise.resolve(new Response("{}")))
    // @ts-expect-error override global fetch for this test
    globalThis.fetch = fetchMock

    expect(maybeScheduleUsagePoll({ access: "token" })).toBe(false)
    expect(maybeScheduleUsagePoll({ accountId: "acc" })).toBe(false)
    expect(maybeScheduleUsagePoll({ access: "token", accountId: undefined })).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("throttles usage polls to one request per interval", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            rate_limit: {
              primary_window: { used_percent: 1, limit_window_seconds: 300 },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    )
    // @ts-expect-error override global fetch for this test
    globalThis.fetch = fetchMock

    expect(
      maybeScheduleUsagePoll(
        { access: "token", accountId: "acc" },
        { minIntervalMs: USAGE_POLL_MIN_INTERVAL_MS },
      ),
    ).toBe(true)
    expect(
      maybeScheduleUsagePoll(
        { access: "token", accountId: "acc" },
        { minIntervalMs: USAGE_POLL_MIN_INTERVAL_MS },
      ),
    ).toBe(false)

    await Bun.sleep(20)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    __setStateForTest({ lastPollAt: Date.now() - USAGE_POLL_MIN_INTERVAL_MS - 1, pollInflight: false })
    expect(
      maybeScheduleUsagePoll(
        { access: "token", accountId: "acc" },
        { minIntervalMs: USAGE_POLL_MIN_INTERVAL_MS },
      ),
    ).toBe(true)
    await Bun.sleep(20)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
