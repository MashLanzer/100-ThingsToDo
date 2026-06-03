// Caches the couple photo URL in localStorage so surfaces that render before
// (or independently of) the network — like the app lock screen — can show it
// without waiting for an authenticated fetch.

const COUPLE_PHOTO_KEY = "ttd_couple_photo_v1"

export function getCachedCouplePhoto(): string | null {
  try {
    return localStorage.getItem(COUPLE_PHOTO_KEY)
  } catch {
    return null
  }
}

export function setCachedCouplePhoto(url: string | null | undefined) {
  try {
    if (url) localStorage.setItem(COUPLE_PHOTO_KEY, url)
    else localStorage.removeItem(COUPLE_PHOTO_KEY)
  } catch {
    /* storage unavailable */
  }
}
