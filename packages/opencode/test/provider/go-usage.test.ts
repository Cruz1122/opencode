import { afterEach, describe, expect, mock, test } from "bun:test"
import { Provider } from "@opencode-ai/schema/provider"
import {
  __getStateForTest,
  __setStateForTest,
  applyLimitReached,
  clear,
  maybeScheduleUsagePoll,
  parseGoUsagePayload,
  refreshUsage,
  updateFromUsagePayload,
  USAGE_POLL_MIN_INTERVAL_MS,
} from "../../src/provider/go-usage"

const originalFetch = globalThis.fetch

afterEach(() => {
  clear()
  mock.restore()
  globalThis.fetch = originalFetch
})

describe("go-usage", () => {
  test("parses Go subscription usage payload into primary/secondary/tertiary windows", () => {
    const parsed = parseGoUsagePayload({
      useBalance: false,
      rollingUsage: { status: "ok", usagePercent: 19, resetInSec: 7200 },
      weeklyUsage: { status: "ok", usagePercent: 30, resetInSec: 345_600 },
      monthlyUsage: { status: "ok", usagePercent: 25, resetInSec: 1_414_800 },
    })

    expect(parsed?.primary?.usedPercent).toBe(19)
    expect(parsed?.primary?.windowMinutes).toBe(300)
    expect(parsed?.secondary?.usedPercent).toBe(30)
    expect(parsed?.secondary?.windowMinutes).toBe(10_080)
    expect(parsed?.tertiary?.usedPercent).toBe(25)
    expect(parsed?.tertiary?.windowMinutes).toBe(43_200)
    expect(parsed?.primary?.resetsAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  test("returns undefined when payload has no usable windows", () => {
    expect(parseGoUsagePayload({})).toBeUndefined()
    expect(parseGoUsagePayload(null)).toBeUndefined()
  })

  test("updateFromUsagePayload stores snapshot for opencode-go", () => {
    const snapshot = updateFromUsagePayload({
      rollingUsage: { usagePercent: 10, resetInSec: 60 },
      weeklyUsage: { usagePercent: 20, resetInSec: 120 },
    })
    expect(snapshot?.providerID).toBe(Provider.ID.opencodeGo)
    expect(__getStateForTest().latest).toEqual(snapshot)
  })

  test("does not schedule usage poll without api key", () => {
    const fetchMock = mock(() => Promise.resolve(new Response("{}")))
    // @ts-expect-error override global fetch for this test
    globalThis.fetch = fetchMock
    expect(maybeScheduleUsagePoll(undefined)).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test("throttles usage polls", async () => {
    const fetchMock = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            rollingUsage: { usagePercent: 1, resetInSec: 60 },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    )
    // @ts-expect-error override global fetch for this test
    globalThis.fetch = fetchMock

    expect(maybeScheduleUsagePoll("sk-test")).toBe(true)
    expect(maybeScheduleUsagePoll("sk-test")).toBe(false)
    await Bun.sleep(20)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    __setStateForTest({ lastPollAt: Date.now() - USAGE_POLL_MIN_INTERVAL_MS - 1, pollInflight: false })
    const snapshot = await refreshUsage("sk-test", { force: true })
    expect(snapshot?.primary?.usedPercent).toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test("applyLimitReached marks the exhausted window at 100%", () => {
    const snapshot = applyLimitReached("5 hour", 3600)
    expect(snapshot.primary?.usedPercent).toBe(100)
    expect(snapshot.primary?.windowMinutes).toBe(300)
    expect(snapshot.primary?.resetsAt).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })
})
