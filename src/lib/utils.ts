import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateCoupleCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

/** Returns true if celebrations (confetti, emoji bursts) are enabled. */
export function areCelebrationsEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = localStorage.getItem("ttd_settings_v1")
    if (!raw) return true
    const s = JSON.parse(raw)
    return s.celebrationsEnabled !== false
  } catch { return true }
}

/**
 * Días transcurridos desde la fecha de aniversario (contando el día de inicio).
 * Devuelve null si la fecha es inválida o futura.
 */
export function daysTogether(anniversary?: string | null): number | null {
  if (!anniversary) return null
  const start = new Date(anniversary + "T00:00:00")
  if (isNaN(start.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = today.getTime() - start.getTime()
  if (diff < 0) return null
  return Math.floor(diff / 86_400_000) + 1
}
