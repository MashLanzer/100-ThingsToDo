"use client"

import { useState, useEffect } from "react"
import { AppLockScreen } from "@/components/shared/app-lock-screen"
import {
  isAppLockEnabled, getAppLockPin,
  recordBackgroundTime, shouldRelockAfterBackground, clearBackgroundTime
} from "@/lib/app-lock"

interface Props { children: React.ReactNode }

export function AppLockGate({ children }: Props) {
  const [locked, setLocked] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isNative, setIsNative] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // Check if lock is enabled + PIN is set
    if (isAppLockEnabled() && getAppLockPin()) {
      setLocked(true)
    }

    // Detect native platform and biometric availability
    async function checkBiometric() {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (!Capacitor.isNativePlatform()) return
        setIsNative(true)
        const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")
        const info = await BiometricAuth.checkBiometry()
        setBiometricAvailable(info.isAvailable && info.strongBiometryIsAvailable)
      } catch { /* not native or plugin not available */ }
    }
    checkBiometric()

    // Background/foreground detection
    function handleVisibilityChange() {
      if (document.hidden) {
        recordBackgroundTime()
      } else {
        if (isAppLockEnabled() && getAppLockPin() && shouldRelockAfterBackground()) {
          setLocked(true)
        }
        clearBackgroundTime()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Capacitor app state (native)
    let pluginCleanup: (() => void) | undefined
    ;(async () => {
      try {
        const { App } = await import("@capacitor/app")
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) {
            recordBackgroundTime()
          } else {
            if (isAppLockEnabled() && getAppLockPin() && shouldRelockAfterBackground()) {
              setLocked(true)
            }
            clearBackgroundTime()
          }
        })
        pluginCleanup = () => handle.remove()
      } catch { /* not native */ }
    })()

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      pluginCleanup?.()
    }
  }, [])

  async function handleBiometricAttempt(): Promise<boolean> {
    const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")
    try {
      await BiometricAuth.authenticate({
        reason: "Desbloquea ThingsToDo",
        cancelTitle: "Cancelar",
        allowDeviceCredential: false,
      })
      return true
    } catch {
      return false
    }
  }

  function handleUnlock() {
    setLocked(false)
    clearBackgroundTime()
  }

  // Don't render anything until client hydration
  if (!isMounted) return <>{children}</>

  if (locked) {
    return (
      <AppLockScreen
        onUnlock={handleUnlock}
        allowBiometric={isNative && biometricAvailable}
        onBiometricAttempt={isNative && biometricAvailable ? handleBiometricAttempt : undefined}
      />
    )
  }

  return <>{children}</>
}
