"use client"

import { useAppStore } from "@/stores/app-store"
import { useShallow } from "zustand/react/shallow"
import { Dices, Map, Clock, Wallet, Wifi, Battery, Sun, Flower2, Moon, Music2, Play, Pause, Gamepad2, Tv2, Sparkles, BookHeart } from "lucide-react"
import { TimeCapsuleApp } from "@/components/features/time-capsule-app"
import { SavingsGoalsApp } from "@/components/features/savings-goals-app"
import { MusicApp } from "@/components/features/music-app"
import { MapApp } from "@/components/features/map-app"
import { ChallengesFavorsApp } from "@/components/features/challenges-favors-app"
import { CoupleGamesApp } from "@/components/features/couple-games-app"
import { SeriesApp } from "@/components/features/series-app"
import { MomentsApp } from "@/components/features/moments-app"
import { BookApp } from "@/components/features/book-app"
import { useState, useEffect, useRef } from "react"
import { useDarkMode } from "@/hooks/use-dark-mode"

type AppDef = { id: string; Icon: React.FC<{ size?: number; color?: string }>; name: string; bg: string; iconColor: string }
const APPS: AppDef[] = [
  { id: "series",   Icon: Tv2,       name: "Peliculero",    bg: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 100%)", iconColor: "#c4b5fd" },
  { id: "moments",  Icon: Sparkles,  name: "Momentos",      bg: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", iconColor: "#be185d" },
  { id: "book",     Icon: BookHeart, name: "Nuestro Libro", bg: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)", iconColor: "#92400e" },
  { id: "music",    Icon: Music2,    name: "Música",        bg: "linear-gradient(135deg, #a2d2ff 0%, #7ab9f5 100%)", iconColor: "#1e40af" },
  { id: "desafios", Icon: Dices,     name: "Desafíos",      bg: "linear-gradient(135deg, #ffe8d6 0%, #f5c9a0 100%)", iconColor: "#9a3412" },
  { id: "map",      Icon: Map,       name: "Aventuras",     bg: "linear-gradient(135deg, #d4f1f9 0%, #a0daf0 100%)", iconColor: "#0369a1" },
  { id: "capsule",  Icon: Clock,     name: "Cápsulas",      bg: "linear-gradient(135deg, #f3e8ff 0%, #dcc9f5 100%)", iconColor: "#6d28d9" },
  { id: "goals",    Icon: Wallet,    name: "Metas",         bg: "linear-gradient(135deg, #d1fae5 0%, #a3e4c7 100%)", iconColor: "#065F46" },
  { id: "games",    Icon: Gamepad2,  name: "Juegos",        bg: "linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)", iconColor: "#7c3aed" },
]

type GreetingDef = { main: React.ReactNode; sub: string }
const GREETING_DEFS: Record<string, GreetingDef> = {
  morning:   { main: <><Sun size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />¡Buenos días!</>, sub: "Hoy es un día bonito juntos" },
  afternoon: { main: <><Flower2 size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />¡Buenas tardes!</>, sub: "La tarde es más dulce contigo" },
  night:     { main: <><Moon size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />¡Buenas noches!</>, sub: "Que sueñen juntos esta noche" },
}

export function PhoneModal() {
  const { showPhoneModal, closePhoneModal, activePhoneApp, setActivePhoneApp, nowPlayingTrack, musicIsPlaying, partnerNickname } = useAppStore(
    useShallow((s) => ({
      showPhoneModal: s.showPhoneModal,
      closePhoneModal: s.closePhoneModal,
      activePhoneApp: s.activePhoneApp,
      setActivePhoneApp: s.setActivePhoneApp,
      nowPlayingTrack: s.nowPlayingTrack,
      musicIsPlaying: s.musicIsPlaying,
      partnerNickname: s.partnerNickname,
    }))
  )
  const [time, setTime] = useState("")
  const [hiddenApps, setHiddenApps] = useState<string[]>([])
  // E1: Boot animation — brief dark flash when modal opens
  const [booting, setBooting] = useState(false)
  // UX-A: Swipe-down-to-close
  const [dragY, setDragY] = useState(0)
  const isDragging = useRef(false)
  const startY = useRef(0)

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
    }
  }, [showPhoneModal])

  const isDark = useDarkMode()

  if (!showPhoneModal) return null

  function goHome() {
    setActivePhoneApp("home")
  }

  return (
    <div className="phone-modal-overlay" onClick={closePhoneModal}>
      <div className="phone-slide-in">
        {/* Phone */}
        <div
          className="phone-container"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => { startY.current = e.touches[0].clientY; isDragging.current = true }}
          onTouchMove={(e) => {
            if (!isDragging.current) return
            const dy = e.touches[0].clientY - startY.current
            if (dy > 0) setDragY(dy)
          }}
          onTouchEnd={() => {
            isDragging.current = false
            if (dragY > 80) { setDragY(0); closePhoneModal() }
            else setDragY(0)
          }}
          style={{
            transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
            transition: isDragging.current ? "none" : "transform 0.25s ease",
          }}
        >
          <div className="phone-notch" />
          <div className="phone-screen">


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
                    background: isDark
                      ? "linear-gradient(160deg, #1a1225 0%, #221833 55%, #1a2035 100%)"
                      : "linear-gradient(160deg, #fdf4ff 0%, #fce7f3 55%, #ede9fe 100%)",
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
                              {partnerNickname.trim() ? `${g.sub}, ${partnerNickname.trim()} 💗` : g.sub}
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
                      {APPS.filter((app) => !hiddenApps.includes(app.id)).map((app, idx) => (
                        <div
                          key={app.id}
                          className="app-icon-item"
                          onClick={() => setActivePhoneApp(app.id)}
                          style={{ animation: `appIconIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both`, animationDelay: `${idx * 0.05}s` }}
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
              {activePhoneApp === "games" && (
                <div className="phone-app-view active">
                  <CoupleGamesApp onBack={goHome} />
                </div>
              )}
              {activePhoneApp === "series" && (
                <div className="phone-app-view active">
                  <SeriesApp onBack={goHome} />
                </div>
              )}
              {activePhoneApp === "moments" && (
                <div className="phone-app-view active">
                  <MomentsApp onBack={goHome} />
                </div>
              )}
              {activePhoneApp === "book" && (
                <div className="phone-app-view active">
                  <BookApp onBack={goHome} />
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

