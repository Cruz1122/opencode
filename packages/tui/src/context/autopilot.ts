import { createMemo, onCleanup } from "solid-js"
import type { PermissionRequest } from "@opencode-ai/sdk/v2"
import { createSimpleContext } from "./helper"
import { useSync } from "./sync"
import { useSDK } from "./sdk"
import { useEvent } from "./event"
import { useToast } from "../ui/toast"
import { useProject } from "./project"
import { useKV } from "./kv"

function sessionLineage(
  sessions: { id: string; parentID?: string }[],
  sessionID: string,
) {
  const parent = sessions.reduce((acc, item) => {
    if (item.parentID) acc.set(item.id, item.parentID)
    return acc
  }, new Map<string, string>())
  const seen = new Set([sessionID])
  const ids = [sessionID]

  for (const id of ids) {
    const parentID = parent.get(id)
    if (!parentID || seen.has(parentID)) continue
    seen.add(parentID)
    ids.push(parentID)
  }

  return ids
}

function autopilotFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false
  return (metadata as Record<string, unknown>).autopilot === true
}

function directoryKey(directory: string) {
  return `autopilot:${directory}`
}

export const { use: useAutopilot, provider: AutopilotProvider } = createSimpleContext({
  name: "Autopilot",
  init: () => {
    const sync = useSync()
    const sdk = useSDK()
    const event = useEvent()
    const toast = useToast()
    const project = useProject()
    const kv = useKV()

    const responded = new Set<string>()

    function directoryEnabled() {
      return kv.get(directoryKey(project.instance.directory()), false) === true
    }

    function enabled(sessionID?: string) {
      if (!sessionID) return directoryEnabled()
      return sessionLineage(sync.data.session, sessionID)
        .map((id) => sync.data.session.find((item) => item.id === id))
        .some((session) => session && autopilotFromMetadata(session.metadata))
    }

    const directoryActive = createMemo(directoryEnabled)

    const enabledMemo = (sessionID: () => string | undefined) =>
      createMemo(() => {
        const id = sessionID()
        if (!id) return directoryEnabled()
        return enabled(id)
      })

    function respondOnce(permission: PermissionRequest) {
      if (responded.has(permission.id)) return
      responded.add(permission.id)
      void sdk.client.permission
        .reply({
          reply: "once",
          requestID: permission.id,
          directory: project.instance.directory(),
          workspace: project.workspace.current(),
        })
        .catch(() => {
          responded.delete(permission.id)
        })
    }

    function approvePending(sessionID: string) {
      for (const permission of sync.data.permission[sessionID] ?? []) {
        respondOnce(permission)
      }
      void sdk.client.permission
        .list({
          directory: project.instance.directory(),
          workspace: project.workspace.current(),
        })
        .then((result) => {
          for (const permission of result.data ?? []) {
            if (!permission?.id) continue
            if (!sessionLineage(sync.data.session, permission.sessionID).includes(sessionID)) continue
            if (!enabled(permission.sessionID)) continue
            respondOnce(permission)
          }
        })
        .catch(() => undefined)
    }

    function showToast(active: boolean) {
      toast.show({
        message: active ? "Autopilot enabled" : "Autopilot disabled",
        variant: active ? "error" : "info",
      })
    }

    function toggleDirectory() {
      const directory = project.instance.directory()
      const next = !directoryEnabled()
      kv.set(directoryKey(directory), next)
      showToast(next)
    }

    async function toggle(sessionID: string) {
      const session = sync.data.session.find((item) => item.id === sessionID)
      if (!session) return

      const metadata =
        session.metadata && typeof session.metadata === "object" && !Array.isArray(session.metadata)
          ? { ...(session.metadata as Record<string, unknown>) }
          : {}
      const next = !autopilotFromMetadata(metadata)
      metadata.autopilot = next

      await sdk.client.session.update({
        sessionID,
        metadata,
        directory: project.instance.directory(),
        workspace: project.workspace.current(),
      })

      if (next) approvePending(sessionID)

      showToast(next)
    }

    function toggleCurrent(sessionID?: string) {
      if (sessionID) {
        void toggle(sessionID)
        return
      }
      toggleDirectory()
    }

    function metadataForCreate() {
      if (!directoryEnabled()) return undefined
      return { autopilot: true }
    }

    const unsubscribe = event.on("permission.asked", (evt) => {
      if (!enabled(evt.properties.sessionID)) return
      respondOnce(evt.properties)
    })
    onCleanup(unsubscribe)

    return {
      enabled,
      directoryActive,
      enabledMemo,
      toggle,
      toggleDirectory,
      toggleCurrent,
      metadataForCreate,
    }
  },
})
