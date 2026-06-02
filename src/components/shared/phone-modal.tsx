"use client"

import { useAppStore } from "@/stores/app-store"
import { useShallow } from "zustand/react/shallow"
import { X } from "lucide-react"
import { JournalApp } from "@/components/features/journal-app"
import { TimeCapsuleApp } from "@/components/features/time-capsule-app"
import { SavingsGoalsApp } from "@/components/features/savings-goals-app"
import { MusicApp } from "@/components/features/music-app"
import { MapApp } from "@/components/features/map-app"
import { ChallengesFavorsApp } from "@/components/features/challenges-favors-app"
import { useState, useEffect } from "react"

const APPS = [
  { id: "journal",  emoji: "🗓️", name: "Diario",    bg: "linear-gradient(135deg, #c3e6cb 0%, #a8d5b5 100%)" },
  { id: "music",    emoji: "🎧", name: "Música",     bg: "linear-gradient(135deg, #a2d2ff 0%, #7ab9f5 100%)" },
  { id: "desafios", emoji: "🎯", name: "Desafíos",   bg: "linear-gradient(135deg, #ffe8d6 0%, #f5c9a0 100%)" },
  { id: "map",      emoji: "🗺️", name: "Aventuras", bg: "linear-gradient(135deg, #d4f1f9 0%, #a0daf0 100%)" },
  { id: "capsule",  emoji: "⏳", name: "Cápsulas",  bg: "linear-gradient(135deg, #f3e8ff 0%, #dcc9f5 100%)" },
  { id: "goals",    emoji: "🐖", name: "Metas",      bg: "linear-gradient(135deg, #d1fae5 0%, #a3e4c7 100%)" },
]

const GREETINGS: Record<string, [string, string]> = {
  morning: ["¡Buenos días! ☀️", "Hoy es un día bonito juntos 🌸"],
  afternoon: ["¡Buenas tardes! 🌸", "La tarde es más dulce contigo 💕"],
  night: ["¡Buenas noches! 🌙", "Que sueñen juntos esta noche ✨"],
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
  const [lastJournalDate, setLastJournalDate] = useState<string | null>(null)

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
      setLastJournalDate(localStorage.getItem("ttd_last_journal_date"))
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
                      <span>📶 🔋</span>
                    </div>
                    <div style={{ textAlign: "center", paddingBottom: "0.25rem" }}>
                      {(() => {
                        const h = new Date().getHours()
                        const key = h < 12 ? "morning" : h < 19 ? "afternoon" : "night"
                        const [main, sub] = GREETINGS[key]
                        return (
                          <>
                            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 600, color: "var(--primary)", lineHeight: 1.3 }}>
                              {main}
                            </p>
                            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "0.125rem" }}>
                              {sub}
                            </p>
                          </>
                        )
                      })()}
                    </div>
                    {/* D7: Decorative hearts strip */}
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", opacity: 0.25, marginTop: "-0.5rem", marginBottom: "-0.25rem" }}>
                      {["♥","♡","♥","♡","♥"].map((h, i) => (
                        <span key={i} style={{ fontSize: "0.6rem", color: "var(--primary)" }}>{h}</span>
                      ))}
                    </div>

                    {/* D7: Date display */}
                    <div style={{ textAlign: "center", marginTop: "-0.25rem" }}>
                      <span style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: "0.5625rem",
                        fontWeight: 600,
                        color: "var(--foreground-muted)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}>
                        {new Date().toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>

                    <div className="app-grid">
                      {APPS.filter((app) => !hiddenApps.includes(app.id)).map((app, idx) => {
                        const journalDays = app.id === "journal" && lastJournalDate
                          ? Math.floor((Date.now() - new Date(lastJournalDate).getTime()) / 86_400_000)
                          : null
                        const showBadge = app.id === "journal" && journalDays !== null && journalDays > 0
                        return (
                          <div
                            key={app.id}
                            className="app-icon-item"
                            onClick={() => setActivePhoneApp(app.id)}
                            style={{ animation: `appIconIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both`, animationDelay: `${idx * 0.05}s` }}
                          >
                            <div style={{ position: "relative" }}>
                              <div
                                className="app-icon-bg"
                                style={{ background: app.bg }}
                              >
                                {app.emoji}
                              </div>
                              {showBadge && (
                                <span style={{
                                  position: "absolute", top: -4, right: -4,
                                  background: "var(--secondary)",
                                  color: "white",
                                  fontSize: "0.45rem",
                                  fontWeight: 700,
                                  borderRadius: "999px",
                                  padding: "1px 4px",
                                  lineHeight: 1.4,
                                  border: "1.5px solid white",
                                  fontFamily: "'Quicksand', sans-serif",
                                }}>
                                  {journalDays === 1 ? "ayer" : `${journalDays}d`}
                                </span>
                              )}
                            </div>
                            <span className="app-icon-name">{app.name}</span>
                          </div>
                        )
                      })}
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
                <span style={{ fontSize: "1rem" }}>{nowPlayingTrack.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nowPlayingTrack.title}</div>
                  <div style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.8)" }}>{nowPlayingTrack.artist}</div>
                </div>
                <div style={{ fontSize: "0.875rem" }}>🎵</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
