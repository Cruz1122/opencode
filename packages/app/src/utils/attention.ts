export function isAppFocused() {
  if (typeof document === "undefined") return true
  return document.visibilityState === "visible" && document.hasFocus()
}

export function isViewingSessionContext(input: {
  directory: string
  sessionID: string
  parentID?: string
  currentDirectory?: string
  currentSession?: string
  directoryKey?: (directory: string) => string
}) {
  const key = input.directoryKey ?? ((value) => value)
  if (!input.currentDirectory || !input.currentSession) return false
  if (key(input.directory) !== key(input.currentDirectory)) return false
  if (input.sessionID === input.currentSession) return true
  if (input.parentID === input.currentSession) return true
  return false
}

export function shouldPlayAttentionSound(input: {
  directory: string
  sessionID?: string
  parentID?: string
  currentDirectory?: string
  currentSession?: string
  directoryKey?: (directory: string) => string
}) {
  if (!input.sessionID) return true
  if (
    !isViewingSessionContext({
      directory: input.directory,
      sessionID: input.sessionID,
      parentID: input.parentID,
      currentDirectory: input.currentDirectory,
      currentSession: input.currentSession,
      directoryKey: input.directoryKey,
    })
  ) {
    return true
  }
  return !isAppFocused()
}
