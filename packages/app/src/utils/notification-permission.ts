import type { NotificationPermissionState } from "@/context/platform"

export function readNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  if (Notification.permission !== "default") return Notification.permission
  return Notification.requestPermission().catch(() => "denied")
}
