"use client"

import { useAppStore } from "@/stores/app-store"
import { useShallow } from "zustand/react/shallow"
import { X, BookOpen, Dices, Map, Clock, Wallet, Wifi, Battery, Sun, Flower2, Moon, Music2, Play, Pause } from "lucide-react"
import { JournalApp } from "@/components/features/journal-app"
import { TimeCapsuleApp } from "@/components/features/time-capsule-app"
import { SavingsGoalsApp } from "@/components/features/savings-goals-app"
import { MusicApp } from "@/components/features/music-app"
import { MapApp } from "@/components/features/map-app"
import { ChallengesFavorsApp } from "@/components/features/challenges-favors-app"
import { useState, useEffect } from "react"

type AppDef = { id: string; Icon: React.FC<{ size?: number; color?: string }>; name: string; bg: string; iconColor: string }
const APPS: AppDef[] = [
  { id: "journal",  Icon: BookOpen, name: "Diario",    bg: "linear-gradient(135deg, #c3e6cb 0%, #a8d5b5 100%)", iconColor: "#065F46" },
  { id: "music",    Icon: Music2,   name: "Música",    bg: "linear-gradient(135deg, #a2d2ff 0%, #7ab9f5 100%)", iconColor: "#1e40af" },
  { id: "desafios", Icon: Dices,    name: "Desafíos",  bg: "linear-gradient(135deg, #ffe8d6 0%, #f5c9a0 100%)", iconColor: "#9a3412" },
  { id: "map",      Icon: Map,      name: "Aventuras", bg: "linear-gradient(135deg, #d4f1f9 0%, #a0daf0 100%)", iconColor: "#0369a1" },
  { id: "capsule",  Icon: Clock,    name: "Cápsulas",  bg: "linear-gradient(135deg, #f3e8ff 0%, #dcc9f5 100%)", iconColor: "#6d28d9" },
  { id: "goals",    Icon: Wallet,   name: "Metas",     bg: "linear-gradient(135deg, #d1fae5 0%, #a3e4c7 100%)", iconColor: "#065F46" },
]

type GreetingDef = { main: React.ReactNode; sub: string }
const GREETING_DEFS: Record<string, GreetingDef> = {
  morning:   { main: <><Sun size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />¡Buenos días!</>, sub: "Hoy es un día bonito juntos" },
  afternoon: { main: <><Flower2 size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />¡Buenas tardes!</>, sub: "La tarde es más dulce contigo" },
  night:     { main: <><Moon size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />¡Buenas noches!</>, sub: "Que sueñen juntos esta noche" },
}

export function PhoneModal() {
  const { showPhoneModal, closePhoneModal, activePhoneApp, setActivePhoneApp, nowPlayingTrack, musicIsPlaying } = useAppStore(
    useShallow((s) => ({
      showPhoneModal: s.showPhoneModal,
      closePhoneModal: s.closePhoneModal,
      activePhoneApp: s.activePhoneApp,
      setActivePhoneApp: s.setActivePhoneApp,
      nowPlayingTrack: s.nowPlayingTrack,
      musicIsPlaying: s.musicIsPlaying,
    }))
  )
  const [time, setTime] = useState("")
  const [hiddenApps, setHiddenApps] = useState<string[]>([])
  const [lastJournalDate, setLastJournalDate] = useState<string | null>(null)
  // E1: Boot animation — brief dark flash when modal opens
  const [booting, setBooting] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (showPhoneModal) {
      setBooting(true)
      setTimeout(() => setBooting(false), 350)
    }
  }, [showPhoneModal])

  useEffect(() => {
    if (showPhoneModal) {
      try {
        const raw = localStorage.getItem("ttd_settings_v1")
        if (raw) {
          const s = JSON.parse(raw)
          setHiddenApps(Array.isArray(s.hiddenApps) ? s.hiddenApps : [])
        } else {
          setHiddenApps([])
        }
      } catch { setHiddenApps([]) }
      setLastJournalDate(localStorage.getItem("ttd_last_journal_date"))
    }
  }, [showPhoneModal])

  if (!showPhoneModal) return null

  function goHome() {
    setActivePhoneApp("home")
  }

  return (
    <div className="phone-modal-overlay" onClick={closePhoneModal}>
      <div className="phone-slide-in">
        {/* Phone */}
        <div className="phone-container" onClick={(e) => e.stopPropagation()}>
          <div className="phone-notch" />
          <div className="phone-screen">

            {/* Permanent kawaii wallpaper — always behind everything */}
            <svg
              aria-hidden
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.3, zIndex: 0 }}
              viewBox="0 0 220 480"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M30 60 C30 60 14 48 14 38 C14 30 22 26 30 33 C38 26 46 30 46 38 C46 48 30 60 30 60Z" fill="#EC4899" opacity="0.6" />
              <path d="M190 140 C190 140 178 131 178 124 C178 118 184 115 190 120 C196 115 202 118 202 124 C202 131 190 140 190 140Z" fill="#8B5CF6" opacity="0.55" />
              <path d="M50 390 C50 390 38 381 38 374 C38 368 44 365 50 370 C56 365 62 368 62 374 C62 381 50 390 50 390Z" fill="#EC4899" opacity="0.5" />
              <path d="M170 420 C170 420 162 414 162 409 C162 405 166 403 170 406 C174 403 178 405 178 409 C178 414 170 420 170 420Z" fill="#F59E0B" opacity="0.55" />
              <path d="M15 240 C15 240 6 233 6 228 C6 224 10 222 15 225 C20 222 24 224 24 228 C24 233 15 240 15 240Z" fill="#8B5CF6" opacity="0.4" />
              <path d="M205 320 C205 320 197 314 197 309 C197 305 200 303 205 306 C210 303 213 305 213 309 C213 314 205 320 205 320Z" fill="#EC4899" opacity="0.45" />
              <text x="160" y="75" fontSize="14" fill="#F59E0B" opacity="0.6">✨</text>
              <text x="8"   y="190" fontSize="10" fill="#8B5CF6" opacity="0.5">⭐</text>
              <text x="192" y="260" fontSize="11" fill="#EC4899" opacity="0.5">✨</text>
              <text x="75"  y="450" fontSize="10" fill="#F59E0B" opacity="0.45">⭐</text>
              <text x="130" y="340" fontSize="9"  fill="#8B5CF6" opacity="0.4">✦</text>
              <circle cx="105" cy="18"  r="5" fill="#8B5CF6" opacity="0.15" />
              <circle cx="180" cy="200" r="8" fill="#EC4899" opacity="0.1" />
              <circle cx="20"  cy="350" r="6" fill="#F59E0B" opacity="0.13" />
              <circle cx="210" cy="90"  r="4" fill="#EC4899" opacity="0.12" />
            </svg>

            {/* X close button — inside phone, top-right overlay */}
            <button
              onClick={closePhoneModal}
              style={{
                position: "absolute", top: 10, right: 10,
                width: 30, height: 30, borderRadius: "50%",
                background: "rgba(0,0,0,0.32)",
                backdropFilter: "blur(4px)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 30,
              }}
            >
              <X size={14} color="white" />
            </button>

            {/* E1: Boot flash overlay */}
            {booting && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 999,
                background: "#0a0a0a",
                animation: "phoneBoot 0.35s ease forwards",
                borderRadius: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: "1.5rem", opacity: 0.6, animation: "phoneBoot 0.35s ease forwards" }}>💕</span>
              </div>
            )}
            <div className="phone-app-container" style={{ position: "relative", zIndex: 1 }}>
              {/* Homescreen */}
              {activePhoneApp === "home" && (
                <div className="phone-app-view active">
                  <div className="phone-homescreen" style={{
                    background: "linear-gradient(160deg, #fdf4ff 0%, #fce7f3 55%, #ede9fe 100%)",
                    position: "relative",
                  }}>
                    <div className="phone-status-bar">
                      <span style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600 }}>{time}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Wifi size={11} />
                        <Battery size={11} />
                      </span>
                    </div>
                    <div style={{ textAlign: "center", paddingBottom: "0.25rem" }}>
                      {(() => {
                        const h = new Date().getHours()
                        const key = h < 12 ? "morning" : h < 19 ? "afternoon" : "night"
                        const g = GREETING_DEFS[key]
                        return (
                          <>
                            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 600, color: "var(--primary)", lineHeight: 1.3 }}>
                              {g.main}
                            </p>
                            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>
                              {g.sub}
                            </p>
                          </>
                        )
                      })()}
                    </div>
                    <div className="app-grid">
                      {APPS.filter((app) => !hiddenApps.includes(app.id)).map((app) => (
                        <div
                          key={app.id}
                          className="app-icon-item"
                          onClick={() => setActivePhoneApp(app.id)}
                        >
                          <div
                            className="app-icon-bg"
                            style={{ background: app.bg, display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <app.Icon size={26} color={app.iconColor} />
                          </div>
                          <span className="app-icon-name">{app.name}</span>
                          {app.id === "journal" && lastJournalDate && (
                            <span style={{ fontSize: "0.45rem", color: "var(--foreground-muted)", textAlign: "center", lineHeight: 1.1, marginTop: 1 }}>
                              {(() => {
                                const days = Math.floor((Date.now() - new Date(lastJournalDate).getTime()) / 86_400_000)
                                return days === 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days}d`
                              })()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Individual apps */}
              {activePhoneApp === "journal" && (
                <div className="phone-app-view active">
                  <JournalApp onBack={goHome} />
                </div>
              )}
              {/* MusicApp always mounted so audio persists when navigating away */}
              <div className="phone-app-view active" style={{ display: activePhoneApp === "music" ? "flex" : "none" }}>
                <MusicApp onBack={goHome} />
              </div>
              {activePhoneApp === "desafios" && (
                <div className="phone-app-view active">
                  <ChallengesFavorsApp onBack={goHome} />
                </div>
              )}
              {activePhoneApp === "capsule" && (
                <div className="phone-app-view active">
                  <TimeCapsuleApp onBack={goHome} />
                </div>
              )}
              {activePhoneApp === "goals" && (
                <div className="phone-app-view active">
                  <SavingsGoalsApp onBack={goHome} />
                </div>
              )}
              {activePhoneApp === "map" && (
                <div className="phone-app-view active">
                  <MapApp onBack={goHome} />
                </div>
              )}
            </div>
            {/* Mini player bar — shown when track is set and not in music app */}
            {activePhoneApp !== "music" && nowPlayingTrack && (
              <div
                style={{
                  position: "absolute", bottom: "40px", left: 0, right: 0,
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  padding: "0.375rem 0.625rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  zIndex: 10,
                }}
              >
                <div
                  style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}
                  onClick={() => setActivePhoneApp("music")}
                >
                  <Music2 size={15} color="white" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nowPlayingTrack.title}</div>
                    <div style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.8)" }}>{nowPlayingTrack.artist}</div>
                  </div>
                </div>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("ttd:music:toggle"))}
                  style={{
                    background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%",
                    width: "28px", height: "28px", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  {musicIsPlaying
                    ? <Pause size={13} color="white" fill="white" />
                    : <Play size={13} color="white" fill="white" />
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

