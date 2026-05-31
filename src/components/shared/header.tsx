"use client"

import { useAppStore } from "@/stores/app-store"
import { useEffect } from "react"

export function AppHeader() {
  const { coupleName, setCoupleName } = useAppStore()

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ttd_settings_v1")
      if (raw) {
        const s = JSON.parse(raw)
        if (s.coupleName && s.coupleName.trim()) setCoupleName(s.coupleName.trim())
      }
    } catch { /* ignore */ }
  }, [setCoupleName])

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--primary)">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          <span className="header-title header-title-gradient">{coupleName}</span>
        </div>
      </div>
    </header>
  )
}
