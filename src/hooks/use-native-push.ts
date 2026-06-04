"use client"
import { useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

async function subscribeWebPush(): Promise<void> {
  if (typeof window === "undefined") return
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return

  try {
    const registration = await navigator.serviceWorker.register("/sw.js")
    const applicationServerKey = urlBase64ToUint8Array(vapidKey)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    const fbToken = await getFirebaseToken()
    if (!fbToken) return

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${fbToken}` },
      body: JSON.stringify(subscription),
    })
  } catch {
    /* permission denied or unsupported — ignore */
  }
}

/**
 * Registers the native Android device for FCM push notifications.
 * On web browsers, registers a service worker and subscribes to Web Push (VAPID).
 * Safe to call from any client component that mounts when the user is logged in.
 */
export function useNativePush() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor.isNativePlatform()) {
          // Web browser path: subscribe via service worker + Web Push API
          await subscribeWebPush()
          return
        }
        const { PushNotifications } = await import("@capacitor/push-notifications")

        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions()
        if (perm.receive !== "granted") return

        await PushNotifications.addListener("registration", async (token) => {
          if (cancelled) return
          try {
            const fbToken = await getFirebaseToken()
            if (!fbToken) return
            await fetch("/api/push/register-native", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${fbToken}` },
              body: JSON.stringify({ token: token.value }),
            })
          } catch {
            /* ignore */
          }
        })

        await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
          const url = action?.notification?.data?.url
          if (url && typeof window !== "undefined") window.location.href = url
        })

        await PushNotifications.register()
      } catch {
        /* not native / plugin missing */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
}

export { subscribeWebPush }
