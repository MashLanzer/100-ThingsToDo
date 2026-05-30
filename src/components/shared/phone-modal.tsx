"use client"

import { useAppStore } from "@/stores/app-store"
import { X } from "lucide-react"
import { DailyChallengeApp } from "@/components/features/daily-challenge-app"
import { JournalApp } from "@/components/features/journal-app"
import { TimeCapsuleApp } from "@/components/features/time-capsule-app"
import { SavingsGoalsApp } from "@/components/features/savings-goals-app"
import { MusicApp } from "@/components/features/music-app"
import { FavorsApp } from "@/components/features/favors-app"
import { MapApp } from "@/components/features/map-app"
import { useState, useEffect } from "react"

const APPS = [
  { id: "journal",   emoji: "🗓️", name: "Diario",       bg: "#c3e6cb" },
  { id: "music",     emoji: "🎧", name: "Música",        bg: "#a2d2ff" },
  { id: "challenge", emoji: "🎁", name: "Reto Diario",   bg: "#ffdeeb" },
  { id: "map",       emoji: "🗺️", name: "Aventuras",    bg: "#d4f1f9" },
  { id: "favors",    emoji: "💝", name: "Favores",       bg: "#f9d4f1" },
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
                  <div className="phone-homescreen">
                    <div className="phone-status-bar">
                      <span>{time}</span>
                      <span>📶 🔋</span>
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
              {activePhoneApp === "challenge" && (
                <div className="phone-app-view active">
                  <DailyChallengeApp onBack={goHome} />
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
              {activePhoneApp === "favors" && (
                <div className="phone-app-view active">
                  <FavorsApp onBack={goHome} />
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
