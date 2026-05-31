"use client"

import { useAppStore } from "@/stores/app-store"
import { useCoupleStatus } from "@/hooks/use-couple"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Smartphone, Settings2 } from "lucide-react"
import { getFirebaseAuth } from "@/lib/firebase/client"

const CONFETTI_COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#A78BFA"]

function ConfettiOverlay() {
  const pieces = useRef(
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(i * 4.5) % 100}%`,
      delay: `${(i * 0.12) % 2.5}s`,
      duration: `${2.2 + (i % 3) * 0.8}s`,
      size: 6 + (i % 4) * 2,
    }))
  ).current

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            background: p.color,
            left: p.left,
            top: 0,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </>
  )
}

function getPageTitle(path: string, coupleName: string): string {
  if (path.startsWith("/fotos")) return "Nuestras Fotos"
  if (path.startsWith("/plans/")) return "Lista de Tareas"
  return coupleName
}

export function AppHeader() {
  const { coupleName, setCoupleName, openPhoneModal, openSettingsModal } = useAppStore()
  const pathname = usePathname()
  const { data } = useCoupleStatus()
  const [isAnniversary, setIsAnniversary] = useState(false)
  const [partnerActive, setPartnerActive] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const token = await getFirebaseAuth().currentUser?.getIdToken()
        if (!token) return
        const res = await fetch("/api/activity/partner", { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return
        const { lastActive } = await res.json()
        if (lastActive) setPartnerActive((Date.now() - new Date(lastActive).getTime()) / 3_600_000 < 24)
      } catch { /* ignore */ }
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ttd_settings_v1")
      if (raw) {
        const s = JSON.parse(raw)
        if (s.coupleName && s.coupleName.trim()) setCoupleName(s.coupleName.trim())
      }
    } catch { /* ignore */ }
  }, [setCoupleName])

  useEffect(() => {
    if (data?.couple?.created_at) {
      const d = new Date(data.couple.created_at)
      const today = new Date()
      setIsAnniversary(d.getDate() === today.getDate() && d.getMonth() === today.getMonth())
    }
  }, [data?.couple?.created_at])

  const title = getPageTitle(pathname, coupleName)

  return (
    <>
      {isAnniversary && <ConfettiOverlay />}
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--primary)">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="header-title header-title-gradient">{title}</span>
          </div>
          {isAnniversary && (
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--secondary)", fontFamily: "'Fredoka', sans-serif" }}>
              ¡Aniversario!
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <button
              className="btn-icon"
              onClick={() => openPhoneModal("home")}
              title="Apps"
              style={{ position: "relative" }}
            >
              <Smartphone size={20} />
              {partnerActive && (
                <span style={{
                  position: "absolute", top: 4, right: 4,
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#10B981", border: "1.5px solid white",
                }} />
              )}
            </button>
            <button
              className="btn-icon"
              onClick={() => openSettingsModal()}
              title="Ajustes"
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>
      </header>
    </>
  )
}
