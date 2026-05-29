"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipForward, SkipBack, Music } from "lucide-react"

interface Track {
  title: string
  artist: string
  emoji: string
  color: string
  url?: string // streaming URL (user adds their own)
}

const PLACEHOLDER_TRACKS: Track[] = [
  { title: "Perfect", artist: "Ed Sheeran", emoji: "🎸", color: "#a2d2ff" },
  { title: "All of Me", artist: "John Legend", emoji: "🎹", color: "#ffdeeb" },
  { title: "A Thousand Years", artist: "Christina Perri", emoji: "🌹", color: "#fce4ec" },
  { title: "Can't Help Falling in Love", artist: "Elvis Presley", emoji: "💫", color: "#ede9fe" },
  { title: "Lover", artist: "Taylor Swift", emoji: "💕", color: "#fde68a" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran", emoji: "🎶", color: "#c3e6cb" },
]

interface Props { onBack: () => void }

export function MusicApp({ onBack }: Props) {
  const [trackIndex, setTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const track = PLACEHOLDER_TRACKS[trackIndex]

  function prev() {
    setTrackIndex((i) => (i - 1 + PLACEHOLDER_TRACKS.length) % PLACEHOLDER_TRACKS.length)
    setIsPlaying(false)
  }

  function next() {
    setTrackIndex((i) => (i + 1) % PLACEHOLDER_TRACKS.length)
    setIsPlaying(false)
  }

  function togglePlay() {
    if (audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying((p) => !p)
    }
    // If no audio src, just toggle state (visual only in demo)
    else {
      setIsPlaying((p) => !p)
    }
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>🎧 Nuestra Música</span>
      </div>
      <div
        className="app-content-body"
        style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}
      >
        {/* Album art */}
        <div
          style={{
            width: "140px",
            height: "140px",
            borderRadius: "20px",
            background: track.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "3.5rem",
            boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
            transition: "all 0.3s ease",
            animation: isPlaying ? "spin 8s linear infinite" : "none",
          }}
        >
          {track.emoji}
        </div>

        {/* Track info */}
        <div style={{ marginTop: "1rem" }}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--foreground)",
              fontFamily: "'Fredoka', sans-serif",
            }}
          >
            {track.title}
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>{track.artist}</p>
        </div>

        {/* Visual progress bar (decorative) */}
        <div style={{ width: "80%", marginTop: "1rem" }}>
          <div
            style={{
              height: "4px",
              background: "var(--muted)",
              borderRadius: "999px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: isPlaying ? "45%" : "0%",
                background: "linear-gradient(90deg, var(--primary), var(--secondary))",
                borderRadius: "999px",
                transition: isPlaying ? "width 8s linear" : "width 0.3s",
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginTop: "1rem" }}>
          <button
            onClick={prev}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--foreground-light)",
              display: "flex",
            }}
          >
            <SkipBack size={24} />
          </button>
          <button
            onClick={togglePlay}
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              border: "none",
              cursor: "pointer",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(139,92,246,0.35)",
            }}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
          </button>
          <button
            onClick={next}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--foreground-light)",
              display: "flex",
            }}
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* Track list */}
        <div style={{ width: "100%", marginTop: "1rem" }}>
          <h4 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)", marginBottom: "0.5rem", textAlign: "left" }}>
            Lista de reproducción
          </h4>
          {PLACEHOLDER_TRACKS.map((t, i) => (
            <button
              key={i}
              onClick={() => { setTrackIndex(i); setIsPlaying(false) }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                width: "100%",
                padding: "0.5rem",
                background: trackIndex === i ? "var(--primary-lighter)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: t.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {t.emoji}
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: trackIndex === i ? "var(--primary)" : "var(--foreground)" }}>
                  {t.title}
                </div>
                <div style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{t.artist}</div>
              </div>
              {trackIndex === i && isPlaying && (
                <Music size={14} style={{ marginLeft: "auto", color: "var(--primary)" }} />
              )}
            </button>
          ))}
        </div>

        <audio ref={audioRef} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
