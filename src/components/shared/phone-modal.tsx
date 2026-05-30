"use client"

import { useAppStore } from "@/stores/app-store"
import { useShallow } from "zustand/react/shallow"
import { X, BookOpen, Dices, Map, Clock, Wallet, Wifi, Battery, Sun, Flower2, Moon, Music2 } from "lucide-react"
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
  const { showPhoneModal, closePhoneModal, activePhoneApp, setActivePhoneApp, nowPlayingTrack } = useAppStore(
    useShallow((s) => ({
      showPhoneModal: s.showPhoneModal,
      closePhoneModal: s.closePhoneModal,
      activePhoneApp: s.activePhoneApp,
      setActivePhoneApp: s.setActivePhoneApp,
      nowPlayingTrack: s.nowPlayingTrack,
    }))
  )
  const [time, setTime] = useState("")
  const [hiddenApps, setHiddenApps] = useState<string[]>([])

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
      try {
        const raw = localStorage.getItem("ttd_settings_v1")
        if (raw) {
          const s = JSON.parse(raw)
          setHiddenApps(Array.isArray(s.hiddenApps) ? s.hiddenApps : [])
        } else {
          setHiddenApps([])
        }
      } catch { setHiddenApps([]) }
    }
  }, [showPhoneModal])

  if (!showPhoneModal) return null

  function goHome() {
    setActivePhoneApp("home")
  }

  return (
    <div className="phone-modal-overlay" onClick={closePhoneModal}>
      <div style={{ position: "relative" }}>
        {/* Close button outside the phone */}
        <button
          onClick={closePhoneModal}
          style={{
            position: "absolute",
            top: "-12px",
            right: "-12px",
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "white",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <X size={14} color="#2D1B3E" />
        </button>

        {/* Phone */}
        <div className="phone-container" onClick={(e) => e.stopPropagation()}>
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="phone-app-container">
              {/* Homescreen */}
              {activePhoneApp === "home" && (
                <div className="phone-app-view active">
                  <div className="phone-homescreen" style={{
                    background: "linear-gradient(160deg, #fdf4ff 0%, #fce7f3 60%, #ede9fe 100%)",
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
              {activePhoneApp === "music" && (
                <div className="phone-app-view active">
                  <MusicApp onBack={goHome} />
                </div>
              )}
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
            {/* Mini player bar — shown when music is playing and user is in another app */}
            {activePhoneApp !== "music" && nowPlayingTrack && (
              <div
                style={{
                  position: "absolute", bottom: "40px", left: 0, right: 0,
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  padding: "0.5rem 0.75rem",
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  cursor: "pointer",
                  zIndex: 10,
                }}
                onClick={() => setActivePhoneApp("music")}
              >
                <Music2 size={16} color="white" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nowPlayingTrack.title}</div>
                  <div style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.8)" }}>{nowPlayingTrack.artist}</div>
                </div>
                <Music2 size={14} color="white" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
