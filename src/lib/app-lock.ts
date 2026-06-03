export const APP_LOCK_ENABLED_KEY = "ttd_app_lock_v1"
export const APP_LOCK_PIN_KEY = "ttd_app_lock_pin_v1"  // separate from journal PIN
export const APP_LOCK_BIO_KEY = "ttd_app_lock_bio_v1"

export function isAppLockBioEnabled(): boolean {
  if (typeof window === "undefined") return false
  try { return localStorage.getItem(APP_LOCK_BIO_KEY) === "true" } catch { return false }
}

export function setAppLockBioEnabled(v: boolean) {
  try { localStorage.setItem(APP_LOCK_BIO_KEY, v ? "true" : "false") } catch {}
}
const LOCK_TIMEOUT_MS = 30_000 // 30 seconds in background before requiring re-lock

export function isAppLockEnabled(): boolean {
  if (typeof window === "undefined") return false
  try { return localStorage.getItem(APP_LOCK_ENABLED_KEY) === "true" } catch { return false }
}

export function setAppLockEnabled(v: boolean) {
  try { localStorage.setItem(APP_LOCK_ENABLED_KEY, v ? "true" : "false") } catch {}
}

export function getAppLockPin(): string | null {
  try { return localStorage.getItem(APP_LOCK_PIN_KEY) } catch { return null }
}

export function setAppLockPin(pin: string) {
  try { localStorage.setItem(APP_LOCK_PIN_KEY, pin) } catch {}
}

export function clearAppLockPin() {
  try { localStorage.removeItem(APP_LOCK_PIN_KEY) } catch {}
}

let _bgTime: number | null = null

export function recordBackgroundTime() { _bgTime = Date.now() }
export function shouldRelockAfterBackground(): boolean {
  if (_bgTime === null) return false
  return Date.now() - _bgTime > LOCK_TIMEOUT_MS
}
export function clearBackgroundTime() { _bgTime = null }
