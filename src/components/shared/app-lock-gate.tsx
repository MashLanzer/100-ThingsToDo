"use client"

import { useState, useEffect } from "react"
import { AppLockScreen } from "@/components/shared/app-lock-screen"
import {
  isAppLockEnabled, getAppLockPin,
  recordBackgroundTime, shouldRelockAfterBackground, clearBackgroundTime,
  isAppLockBioEnabled
} from "@/lib/app-lock"

interface Props { children: React.ReactNode }

export function AppLockGate({ children }: Props) {
  const [locked, setLocked] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isNative, setIsNative] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    setBioEnabled(isAppLockBioEnabled())

    // Check biometric BEFORE locking so the lock screen mounts with the
    // correct allowBiometric value and auto-triggers the fingerprint prompt.
    async function initLock() {
      try {
        const { Capacitor } = await import("@capacitor/core")
        if (Capacitor.isNativePlatform()) {
          setIsNative(true)
          const { BiometricAuth } = await import("@aparajita/capacitor-biometric-auth")
          const info = await BiometricAuth.checkBiometry()
          // isAvailable is enough — fingerprint is always considered strong on Android
          setBiometricAvailable(info.isAvailable)
        }
      } catch { /* not native or plugin unavailable */ }

      // Lock AFTER biometric check so AppLockScreen mounts knowing allowBiometric
      if (isAppLockEnabled() && getAppLockPin()) {
        setLocked(true)
      }
    }
    initLock()

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

  useEffect(() => {
    if (locked) {
      setBioEnabled(isAppLockBioEnabled())
    }
  }, [locked])

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
        allowBiometric={isNative && biometricAvailable && bioEnabled}
        onBiometricAttempt={isNative && biometricAvailable && bioEnabled ? handleBiometricAttempt : undefined}
      />
    )
  }

  return <>{children}</>
}
