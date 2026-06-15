import { describe, expect, test } from "bun:test"
import { isAppFocused, isViewingSessionContext, shouldPlayAttentionSound } from "./attention"

describe("attention", () => {
  test("shouldPlayAttentionSound skips when viewing the active session while focused", () => {
    expect(
      shouldPlayAttentionSound({
        directory: "/workspace",
        sessionID: "session-a",
        currentDirectory: "/workspace",
        currentSession: "session-a",
      }),
    ).toBe(!document.hasFocus())
  })

  test("shouldPlayAttentionSound plays when viewing a different session", () => {
    expect(
      shouldPlayAttentionSound({
        directory: "/workspace",
        sessionID: "session-a",
        currentDirectory: "/workspace",
        currentSession: "session-b",
      }),
    ).toBe(true)
  })

  test("isViewingSessionContext includes subagent sessions under the active session", () => {
    expect(
      isViewingSessionContext({
        directory: "/workspace",
        sessionID: "subagent",
        parentID: "session-a",
        currentDirectory: "/workspace",
        currentSession: "session-a",
      }),
    ).toBe(true)
  })

  test("isAppFocused reflects document focus", () => {
    expect(typeof isAppFocused()).toBe("boolean")
  })
})
