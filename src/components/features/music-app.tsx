"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, ListMusic } from "lucide-react"
import { useAppStore } from "@/stores/app-store"

interface Track {
  id: string
  title: string
  artist: string
  url: string
  emoji: string
  color: string
}

interface Playlist {
  id: string
  name: string
  tracks: Track[]
}

const DEMO_PLAYLIST: Playlist = {
  id: "default",
  name: "Nuestra Música 💕",
  tracks: [],
}

const STORAGE_KEY = "ttd_playlists_v2"
const EMOJI_OPTIONS = ["🎵", "🎸", "🎹", "🎺", "🎻", "🥁", "💕", "🌹", "💫", "⭐", "🌙", "✨", "🦋", "🌸", "🎶"]
const COLOR_OPTIONS = ["#a2d2ff", "#ffdeeb", "#fce4ec", "#ede9fe", "#fde68a", "#c3e6cb", "#ffd6a5", "#caffbf", "#bde0fe", "#ffc8dd"]

function loadPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /* */ }
  return [DEMO_PLAYLIST]
}

function savePlaylists(p: Playlist[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /* */ }
}

function isYouTube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be")
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

function VinylRecord({ isPlaying, color, emoji }: { isPlaying: boolean; color: string; emoji: string }) {
  return (
    <div
      style={{
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        background: `radial-gradient(circle at center,
          #111 0%, #111 13%,
          ${color} 14%, ${color} 28%,
          #1c1c1c 29%, #1c1c1c 33%,
          #2e2e2e 34%, #2e2e2e 38%,
          #1c1c1c 39%, #1c1c1c 44%,
          #2e2e2e 45%, #2e2e2e 50%,
          #1c1c1c 51%, #1c1c1c 56%,
          #2e2e2e 57%, #2e2e2e 62%,
          #1c1c1c 63%, #1c1c1c 68%,
          #2e2e2e 69%, #2e2e2e 74%,
          #1c1c1c 75%
        )`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        flexShrink: 0,
        boxShadow: isPlaying
          ? `0 0 0 5px rgba(139,92,246,0.25), 0 14px 44px rgba(0,0,0,0.55)`
          : "0 10px 36px rgba(0,0,0,0.38)",
        animation: isPlaying ? "vinylSpin 3s linear infinite" : "none",
      }}
    >
      {/* Center label */}
      <div style={{
        width: "56px", height: "56px", borderRadius: "50%",
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.625rem",
        boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        zIndex: 1,
      }}>
        {emoji}
      </div>
      {/* Spindle hole */}
      <div style={{
        position: "absolute", width: "8px", height: "8px",
        borderRadius: "50%", background: "#050505", zIndex: 2,
      }} />
    </div>
  )
}

type AppView = "player" | "playlists" | "addTrack" | "addPlaylist"

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

export function MusicApp({ onBack }: { onBack: () => void }) {
  const { setNowPlayingTrack, setMusicIsPlaying } = useAppStore()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistIdx, setPlaylistIdx] = useState(0)
  const [trackIdx, setTrackIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoop, setIsLoop] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [view, setView] = useState<AppView>("player")
  const [loadingDb, setLoadingDb] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Add-track form
  const [newTitle, setNewTitle] = useState("")
  const [newArtist, setNewArtist] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newEmoji, setNewEmoji] = useState("🎵")
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0])
  const [newPlaylistName, setNewPlaylistName] = useState("")

  async function getToken() {
    const { getFirebaseAuth } = await import("@/lib/firebase/client")
    const token = await getFirebaseAuth().currentUser?.getIdToken()
    return token
  }

  async function loadFromServer() {
    setLoadingDb(true)
    try {
      const token = await getToken()
      if (!token) { setPlaylists(loadPlaylists()); setLoadingDb(false); return }
      const res = await fetch("/api/music", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setPlaylists(data)
          savePlaylists(data)
        } else {
          // Server returned empty — use localStorage if it has custom playlists, else empty
          const local = loadPlaylists()
          const hasCustom = local.some((pl) => pl.id !== "default")
          setPlaylists(hasCustom ? local : [{ id: "default", name: "Nuestra Música 💕", tracks: [] }])
        }
      } else {
        setPlaylists(loadPlaylists())
      }
    } catch { setPlaylists(loadPlaylists()) } finally { setLoadingDb(false) }
  }

  async function saveToServer(updated: Playlist[]) {
    try {
      const token = await getToken()
      if (!token) return
      await fetch("/api/music", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      })
    } catch { /* silently fail */ }
  }

  useEffect(() => {
    loadFromServer()
  }, [])

  // Auto-refresh every 30s while in player view
  useEffect(() => {
    const t = setInterval(loadFromServer, 30_000)
    return () => clearInterval(t)
  }, [])

  // Audio time tracking
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => {
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
    }
    const onEnd = () => {
      if (isLoop) { audio.currentTime = 0; audio.play().catch(() => {}) }
      else if (isShuffle) goToRandom()
      else goNext()
    }
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnd)
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnd) }
  })

  function persist(updated: Playlist[]) {
    setPlaylists(updated)
    savePlaylists(updated)
    saveToServer(updated)
  }

  const playlist = playlists[playlistIdx] ?? DEMO_PLAYLIST
  const tracks = playlist.tracks
  const track = tracks[trackIdx] ?? null

  function goTo(idx: number) {
    setTrackIdx(idx)
    setIsPlaying(false)
    setProgress(0)
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.src = "" }
  }

  function goPrev() { goTo((trackIdx - 1 + tracks.length) % tracks.length) }
  function goNext() {
    if (isShuffle) goToRandom()
    else goTo((trackIdx + 1) % tracks.length)
  }
  function goToRandom() {
    if (tracks.length <= 1) return
    let next: number
    do { next = Math.floor(Math.random() * tracks.length) } while (next === trackIdx)
    goTo(next)
  }

  function moveTrack(idx: number, dir: "up" | "down") {
    const swapIdx = dir === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= tracks.length) return
    const newTracks = [...tracks]
    ;[newTracks[idx], newTracks[swapIdx]] = [newTracks[swapIdx], newTracks[idx]]
    const updated = playlists.map((pl, i) => i === playlistIdx ? { ...pl, tracks: newTracks } : pl)
    persist(updated)
    if (trackIdx === idx) setTrackIdx(swapIdx)
    else if (trackIdx === swapIdx) setTrackIdx(idx)
  }

  const togglePlay = useCallback(() => {
    if (!track) return
    if (isYouTube(track.url || "")) {
      const next = !isPlaying
      setIsPlaying(next)
      setMusicIsPlaying(next)
      if (next) setNowPlayingTrack({ title: track.title, artist: track.artist, emoji: track.emoji, color: track.color })
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (!track.url) { setIsPlaying((p) => !p); return }
    if (isPlaying) {
      audio.pause(); setIsPlaying(false); setMusicIsPlaying(false)
    } else {
      if (audio.src !== track.url) audio.src = track.url
      audio.play().then(() => {
        setIsPlaying(true)
        setMusicIsPlaying(true)
        setNowPlayingTrack({ title: track.title, artist: track.artist, emoji: track.emoji, color: track.color })
      }).catch(() => setIsPlaying(true))
    }
  }, [track, isPlaying, setNowPlayingTrack, setMusicIsPlaying])

  // Listen for toggle from mini-player (must be after togglePlay declaration)
  useEffect(() => {
    const handler = () => togglePlay()
    window.addEventListener("ttd:music:toggle", handler)
    return () => window.removeEventListener("ttd:music:toggle", handler)
  }, [togglePlay])

  function addTrack() {
    if (!newTitle.trim()) return
    const t: Track = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      artist: newArtist.trim() || "Artista desconocido",
      url: newUrl.trim(),
      emoji: newEmoji,
      color: newColor,
    }
    persist(playlists.map((pl, i) => i === playlistIdx ? { ...pl, tracks: [...pl.tracks, t] } : pl))
    setNewTitle(""); setNewArtist(""); setNewUrl(""); setNewEmoji("🎵"); setNewColor(COLOR_OPTIONS[0])
    setView("player")
  }

  function deleteTrack(tid: string) {
    persist(playlists.map((pl, i) => i === playlistIdx ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== tid) } : pl))
    if (track?.id === tid) goTo(0)
  }

  function addPlaylist() {
    if (!newPlaylistName.trim()) return
    const newPl: Playlist = { id: Date.now().toString(), name: newPlaylistName.trim(), tracks: [] }
    const updated = [...playlists, newPl]
    persist(updated); setPlaylistIdx(updated.length - 1)
    setNewPlaylistName(""); setView("player")
  }

  function deletePlaylist(idx: number) {
    if (playlists.length <= 1) return
    const updated = playlists.filter((_, i) => i !== idx)
    persist(updated); setPlaylistIdx(Math.max(0, playlistIdx >= updated.length ? updated.length - 1 : playlistIdx))
  }

  function selectPlaylist(idx: number) {
    setPlaylistIdx(idx); setTrackIdx(0); setIsPlaying(false); setProgress(0)
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.src = "" }
    setView("player")
  }

  const ytId = track?.url ? getYouTubeId(track.url) : null

  // ── PLAYLISTS VIEW ──────────────────────────────────────────────────────────
  if (view === "playlists") return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={() => setView("player")}>‹</button>
        <span>🎵 Mis Playlists</span>
      </div>
      <div className="app-content-body" style={{ gap: "0.375rem" }}>
        <button
          onClick={() => setView("addPlaylist")}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
            padding: "0.625rem 0.75rem", marginBottom: "0.25rem",
            background: "var(--primary-lighter)", border: "2px dashed var(--primary)",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700, color: "var(--primary)",
          }}
        >
          <Plus size={15} /> Nueva playlist
        </button>
        {playlists.map((pl, i) => (
          <button
            key={pl.id} onClick={() => selectPlaylist(i)}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
              padding: "0.625rem 0.75rem", textAlign: "left",
              background: i === playlistIdx ? "var(--primary-lighter)" : "white",
              border: `2px solid ${i === playlistIdx ? "var(--primary)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: "1.125rem" }}>🎵</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: i === playlistIdx ? "var(--primary)" : "var(--foreground)" }}>{pl.name}</div>
              <div style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{pl.tracks.length} canciones</div>
            </div>
            {playlists.length > 1 && (
              <span onClick={(e) => { e.stopPropagation(); deletePlaylist(i) }} style={{ cursor: "pointer", color: "var(--foreground-muted)", padding: "4px" }}>
                <Trash2 size={13} />
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )

  // ── ADD PLAYLIST VIEW ───────────────────────────────────────────────────────
  if (view === "addPlaylist") return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={() => setView("playlists")}>‹</button>
        <span>Nueva Playlist</span>
      </div>
      <div className="app-content-body" style={{ gap: "0.75rem" }}>
        <input className="input" placeholder="Nombre de la playlist" value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)} maxLength={50} autoFocus />
        <button className="btn btn-primary" onClick={addPlaylist} disabled={!newPlaylistName.trim()}>
          Crear Playlist
        </button>
      </div>
    </>
  )

  // ── ADD TRACK VIEW ──────────────────────────────────────────────────────────
  if (view === "addTrack") return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={() => setView("player")}>‹</button>
        <span>Añadir Canción</span>
      </div>
      <div className="app-content-body" style={{ gap: "0.625rem" }}>
        <input className="input" placeholder="Título *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={80} autoFocus />
        <input className="input" placeholder="Artista" value={newArtist} onChange={(e) => setNewArtist(e.target.value)} maxLength={60} />
        <input className="input" placeholder="URL de YouTube o MP3 (opcional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
        <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", margin: 0 }}>
          💡 Pega un enlace de YouTube o una URL directa de MP3 para reproducir. Sin URL la canción es solo visual.
        </p>
        {/* Emoji */}
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-light)", marginBottom: "0.375rem" }}>Icono</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {EMOJI_OPTIONS.map((e) => (
              <button key={e} onClick={() => setNewEmoji(e)} style={{
                width: "34px", height: "34px", borderRadius: "8px", fontSize: "1.125rem",
                border: `2px solid ${newEmoji === e ? "var(--primary)" : "var(--border)"}`,
                background: newEmoji === e ? "var(--primary-lighter)" : "white",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{e}</button>
            ))}
          </div>
        </div>
        {/* Color */}
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-light)", marginBottom: "0.375rem" }}>Color del disco</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {COLOR_OPTIONS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: "26px", height: "26px", borderRadius: "50%", background: c, cursor: "pointer",
                border: `3px solid ${newColor === c ? "var(--primary)" : "transparent"}`,
                outline: newColor === c ? "2px solid var(--primary)" : "none", outlineOffset: "2px",
              }} />
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={addTrack} disabled={!newTitle.trim()}>
          <Plus size={15} style={{ marginRight: "5px" }} /> Añadir Canción
        </button>
      </div>
    </>
  )

  // ── PLAYER VIEW ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🎧 {playlist.name}</span>
        <button
          onClick={() => setView("playlists")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "4px", display: "flex", flexShrink: 0 }}
        >
          <ListMusic size={18} />
        </button>
      </div>

      <div className="app-content-body" style={{ alignItems: "center", padding: "0.625rem 0.75rem 0.5rem", gap: 0 }}>
        {/* Vinyl */}
        {loadingDb
          ? <div style={{ width: "150px", height: "150px", borderRadius: "50%", background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>...</div>
          : track
            ? <VinylRecord isPlaying={isPlaying} color={track.color} emoji={track.emoji} />
            : <div style={{ width: "150px", height: "150px", borderRadius: "50%", background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>🎵</div>
        }

        {/* Hidden YouTube iframe */}
        {ytId && isPlaying && (
          <iframe
            key={ytId}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0`}
            style={{ width: 1, height: 1, border: "none", position: "absolute", opacity: 0 }}
            allow="autoplay"
          />
        )}

        {/* Track info */}
        <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", fontFamily: "'Fredoka', sans-serif", margin: 0 }}>
            {track?.title ?? "Sin canciones"}
          </h3>
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: "2px 0 0" }}>{track?.artist ?? ""}</p>
          {track?.url && (
            <p style={{ fontSize: "0.5625rem", color: "var(--primary)", margin: "2px 0 0", fontWeight: 600 }}>
              {isYouTube(track.url) ? "YouTube" : "Audio"}
            </p>
          )}
        </div>

        {/* Progress */}
        <div style={{ width: "82%", marginTop: "0.75rem" }}>
          <div style={{ height: "3px", background: "var(--muted)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: (track?.url && !isYouTube(track.url)) ? `${progress}%` : (isPlaying ? "45%" : "0%"),
              background: "linear-gradient(90deg, var(--primary), var(--secondary))",
              borderRadius: "999px",
              transition: isPlaying ? "width 0.5s linear" : "none",
            }} />
          </div>
          {track?.url && !isYouTube(track.url) && duration > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: "0.5625rem", color: "var(--foreground-muted)", marginTop: "2px" }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          )}
        </div>

        {/* Shuffle/Loop toggles */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.625rem" }}>
          <button
            onClick={() => setIsShuffle((s) => !s)}
            style={{
              padding: "4px 10px", borderRadius: "999px", border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700,
              background: isShuffle ? "var(--primary)" : "var(--muted)",
              color: isShuffle ? "white" : "var(--foreground-muted)",
              transition: "background 0.2s, color 0.2s",
            }}
          >🔀 Aleatorio</button>
          <button
            onClick={() => setIsLoop((l) => !l)}
            style={{
              padding: "4px 10px", borderRadius: "999px", border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700,
              background: isLoop ? "var(--primary)" : "var(--muted)",
              color: isLoop ? "white" : "var(--foreground-muted)",
              transition: "background 0.2s, color 0.2s",
            }}
          >🔁 Repetir</button>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginTop: "0.5rem" }}>
          <button onClick={goPrev} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-light)", display: "flex" }}>
            <SkipBack size={22} />
          </button>
          <button
            onClick={togglePlay}
            disabled={!track}
            style={{
              width: "50px", height: "50px", borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              border: "none", cursor: "pointer", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 4px 18px rgba(139,92,246,0.45)",
              opacity: track ? 1 : 0.5,
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} fill="white" />}
          </button>
          <button onClick={goNext} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-light)", display: "flex" }}>
            <SkipForward size={22} />
          </button>
        </div>

        {/* Track list */}
        <div style={{ width: "100%", marginTop: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <h4 style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Lista · {tracks.length} canciones
            </h4>
            <button
              onClick={() => setView("addTrack")}
              style={{
                display: "flex", alignItems: "center", gap: "3px",
                background: "var(--primary-lighter)", border: "none", borderRadius: "999px",
                cursor: "pointer", color: "var(--primary)", padding: "3px 8px",
                fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700,
              }}
            >
              <Plus size={11} /> Añadir
            </button>
          </div>

          <div style={{ maxHeight: "155px", overflowY: "auto" }}>
            {tracks.length === 0 && (
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", textAlign: "center", padding: "1rem 0" }}>
                ¡Añade tu primera canción! 🎵
              </p>
            )}
            {tracks.map((t, i) => (
              <div
                key={t.id}
                onClick={() => goTo(i)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.625rem",
                  padding: "0.5rem 0.5rem", cursor: "pointer",
                  background: trackIdx === i ? "var(--primary-lighter)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: trackIdx === i ? "3px solid var(--primary)" : "3px solid transparent",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {/* Track number */}
                <span style={{
                  fontFamily: "'Fredoka', sans-serif", fontWeight: 600,
                  fontSize: "0.75rem", color: trackIdx === i ? "var(--primary)" : "var(--foreground-muted)",
                  width: "16px", textAlign: "center", flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                {/* Mini vinyl */}
                <div style={{
                  width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                  background: `radial-gradient(circle, #111 0%, #111 18%, ${t.color} 19%, ${t.color} 44%, #1a1a1a 45%)`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: trackIdx === i ? "var(--primary)" : "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title}
                  </div>
                  {trackIdx === i ? (
                    <div style={{ fontSize: "0.625rem", color: "var(--primary)", fontWeight: 700 }}>▶ Reproduciendo</div>
                  ) : (
                    <div style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{t.artist}{t.url ? (isYouTube(t.url) ? " · YT" : " · Audio") : ""}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); moveTrack(i, "up") }} disabled={i === 0}
                    style={{ background: "none", border: "none", cursor: i > 0 ? "pointer" : "default", color: i > 0 ? "var(--foreground-muted)" : "var(--border)", padding: "1px 4px", fontSize: "0.5rem", lineHeight: 1 }}>▲</button>
                  <button onClick={(e) => { e.stopPropagation(); moveTrack(i, "down") }} disabled={i === tracks.length - 1}
                    style={{ background: "none", border: "none", cursor: i < tracks.length - 1 ? "pointer" : "default", color: i < tracks.length - 1 ? "var(--foreground-muted)" : "var(--border)", padding: "1px 4px", fontSize: "0.5rem", lineHeight: 1 }}>▼</button>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTrack(t.id) }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "6px", flexShrink: 0, display: "flex", alignItems: "center", borderRadius: "6px" }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <audio ref={audioRef} />
      </div>

      <style>{`
        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
