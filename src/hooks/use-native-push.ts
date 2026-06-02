"use client"
import { useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"

/**
 * Registers the native Android device for FCM push notifications.
 * No-op on web (when not running inside a Capacitor native shell), so it is
 * safe to call from any client component that mounts when the user is logged in.
 */
export function useNativePush() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor.isNativePlatform()) return
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
