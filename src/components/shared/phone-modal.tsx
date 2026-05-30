"use client"

import { useAppStore } from "@/stores/app-store"
import { X } from "lucide-react"
import { JournalApp } from "@/components/features/journal-app"
import { TimeCapsuleApp } from "@/components/features/time-capsule-app"
import { SavingsGoalsApp } from "@/components/features/savings-goals-app"
import { MusicApp } from "@/components/features/music-app"
import { MapApp } from "@/components/features/map-app"
import { ChallengesFavorsApp } from "@/components/features/challenges-favors-app"
import { useState, useEffect } from "react"

const APPS = [
  { id: "journal",  emoji: "🗓️", name: "Diario",    bg: "#c3e6cb" },
  { id: "music",    emoji: "🎧", name: "Música",     bg: "#a2d2ff" },
  { id: "desafios", emoji: "🎯", name: "Desafíos",   bg: "#ffe8d6" },
  { id: "map",      emoji: "🗺️", name: "Aventuras", bg: "#d4f1f9" },
  { id: "capsule",  emoji: "⏳", name: "Cápsulas",  bg: "#f3e8ff" },
  { id: "goals",    emoji: "🐖", name: "Metas",      bg: "#d1fae5" },
]

export function PhoneModal() {
  const { showPhoneModal, closePhoneModal, activePhoneApp, setActivePhoneApp } = useAppStore()
  const [time, setTime] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }))
    }
    updateTime()
    const interval = setInterval(updateTime, 60_000)
    return () => clearInterval(interval)
  }, [])

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
                      <p style={{
                        fontFamily: "'Fredoka', sans-serif", fontSize: "1rem",
                        fontWeight: 600, color: "var(--primary)", lineHeight: 1.3,
                      }}>
                        {(() => {
                          const h = new Date().getHours()
                          if (h < 12) return "¡Buenos días! ☀️"
                          if (h < 19) return "¡Buenas tardes! 🌸"
                          return "¡Buenas noches! 🌙"
                        })()}
                      </p>
                    </div>
                    <div className="app-grid">
                      {APPS.map((app) => (
                        <div
                          key={app.id}
                          className="app-icon-item"
                          onClick={() => setActivePhoneApp(app.id)}
                        >
                          <div
                            className="app-icon-bg"
                            style={{ background: app.bg }}
                          >
                            {app.emoji}
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
          </div>
        </div>
      </div>
    </div>
  )
}
