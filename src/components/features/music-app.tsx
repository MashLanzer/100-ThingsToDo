"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, ListMusic, Heart, Moon, X, Pencil, Search } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { toast } from "sonner"
import { useDarkMode } from "@/hooks/use-dark-mode"

interface Track {
  id: string
  title: string
  artist: string
  url: string
  emoji: string
  color: string
  dedication?: string
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
const LIKED_KEY = "ttd_liked_tracks_v1"
const EMOJI_OPTIONS = ["🎵", "🎸", "🎹", "🎺", "🎻", "🥁", "💕", "🌹", "💫", "⭐", "🌙", "✨", "🦋", "🌸", "🎶"]
const COLOR_OPTIONS = ["#a2d2ff", "#ffdeeb", "#fce4ec", "#ede9fe", "#fde68a", "#c3e6cb", "#ffd6a5", "#caffbf", "#bde0fe", "#ffc8dd"]
const SLEEP_OPTIONS = [15, 30, 45, 60]

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

function loadLiked(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}

function saveLiked(s: Set<string>) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])) } catch { /* */ }
}

function isYouTube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be")
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}

function getYtThumb(url: string): string | null {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

// M3: Vinyl with entrance animation when switching tracks
function VinylRecord({ isPlaying, color, emoji, transitioning }: {
  isPlaying: boolean; color: string; emoji: string; transitioning: boolean
}) {
  return (
    <div style={{
      width: "130px", height: "130px", borderRadius: "50%",
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
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", flexShrink: 0,
      boxShadow: isPlaying
        ? `0 0 0 5px rgba(139,92,246,0.25), 0 14px 44px rgba(0,0,0,0.55)`
        : "0 10px 36px rgba(0,0,0,0.38)",
      animation: transitioning
        ? "vinylEnter 0.35s ease"
        : isPlaying
        ? "vinylSpin 3s linear infinite"
        : "none",
      transition: "box-shadow 0.3s",
    }}>
      <div style={{
        width: "48px", height: "48px", borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.625rem", boxShadow: "0 2px 10px rgba(0,0,0,0.3)", zIndex: 1,
      }}>
        {emoji}
      </div>
      <div style={{ position: "absolute", width: "8px", height: "8px", borderRadius: "50%", background: "#050505", zIndex: 2 }} />
    </div>
  )
}

// M2: Audio visualizer bars (CSS animation only)
function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const delays = [0, 0.08, 0.16, 0.24, 0.06, 0.18, 0.10, 0.28, 0.04, 0.20]
  const durations = [0.50, 0.65, 0.55, 0.70, 0.60, 0.48, 0.72, 0.53, 0.67, 0.58]
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2.5px", height: "20px", marginTop: "6px" }}>
      {delays.map((delay, i) => (
        <div key={i} style={{
          width: "3px", borderRadius: "2px", height: "100%",
          background: "linear-gradient(180deg, var(--primary), var(--secondary))",
          transformOrigin: "bottom",
          animation: isPlaying ? `vizBar ${durations[i]}s ease-in-out ${delay}s infinite alternate` : "none",
          transform: isPlaying ? "scaleY(1)" : "scaleY(0.25)",
          opacity: isPlaying ? 0.85 : 0.3,
          transition: "opacity 0.4s, transform 0.4s",
        }} />
      ))}
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
  const isDark = useDarkMode()
  const T = {
    bg:         isDark ? "#1a1225"  : "var(--background)",
    surface:    isDark ? "#221833"  : "var(--surface)",
    surfaceHov: isDark ? "#2a1e3a" : "var(--surface-hover)",
    border:     isDark ? "#4a3465" : "var(--border)",
    borderHov:  isDark ? "#5e4480" : "var(--border-hover)",
    text:       isDark ? "#f0e8ff" : "var(--foreground)",
    textSub:    isDark ? "#c4b8d8" : "var(--foreground-light)",
    textMuted:  isDark ? "#9080a8" : "var(--foreground-muted)",
    muted:      isDark ? "#2a1e3a" : "var(--muted)",
    inputBg:    isDark ? "#2e2244" : "var(--muted)",
  }
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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set())
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null)
  const [showSleepMenu, setShowSleepMenu] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Add-track form
  const [newTitle, setNewTitle] = useState("")
  const [newArtist, setNewArtist] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newEmoji, setNewEmoji] = useState("🎵")
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0])
  const [newDedication, setNewDedication] = useState("")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  // M-B: editing track
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)
  // M-C: search within playlist
  const [trackSearch, setTrackSearch] = useState("")
  const [showTrackSearch, setShowTrackSearch] = useState(false)

  useEffect(() => { setLikedTracks(loadLiked()) }, [])

  useEffect(() => () => {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
  }, [])

  async function getToken() {
    const { getFirebaseToken } = await import("@/lib/firebase/client")
    return await getFirebaseToken()
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
          setPlaylists(data); savePlaylists(data)
        } else {
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
    } catch { /* */ }
  }

  useEffect(() => { loadFromServer() }, [])
  useEffect(() => {
    const t = setInterval(loadFromServer, 30_000)
    return () => clearInterval(t)
  }, [])

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
    setPlaylists(updated); savePlaylists(updated); saveToServer(updated)
  }

  const playlist = playlists[playlistIdx] ?? DEMO_PLAYLIST
  const tracks = playlist.tracks
  const track = tracks[trackIdx] ?? null

  // M3: brief transition animation when changing tracks
  function goTo(idx: number) {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setTrackIdx(idx); setIsPlaying(false); setProgress(0); setCurrentTime(0)
      const audio = audioRef.current
      if (audio) { audio.pause(); audio.src = "" }
      setIsTransitioning(false)
    }, 220)
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

  // M4: toggle heart/like per track
  function toggleLike(trackId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setLikedTracks(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) {
        next.delete(trackId)
        toast("💔 Quitado de favoritas", { duration: 1500 })
      } else {
        next.add(trackId)
        toast("❤️ ¡Añadido a favoritas!", { duration: 1500 })
      }
      saveLiked(next)
      return next
    })
  }

  // M6: sleep timer
  function startSleepTimer(minutes: number) {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    setSleepMinutesLeft(minutes)
    setShowSleepMenu(false)
    toast(`🌙 Música se detendrá en ${minutes} min`, { duration: 2500 })

    let remaining = minutes
    sleepIntervalRef.current = setInterval(() => {
      remaining -= 1
      setSleepMinutesLeft(remaining)
      if (remaining <= 0 && sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    }, 60_000)

    sleepTimerRef.current = setTimeout(() => {
      const audio = audioRef.current
      if (audio) audio.pause()
      setIsPlaying(false); setMusicIsPlaying(false); setSleepMinutesLeft(null)
      toast("🌙 Música detenida. ¡Buenas noches! 💤", { duration: 4000 })
    }, minutes * 60_000)
  }

  function cancelSleepTimer() {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    setSleepMinutesLeft(null); setShowSleepMenu(false)
    toast("⏰ Timer cancelado", { duration: 1500 })
  }

  const togglePlay = useCallback(() => {
    if (!track) return
    if (isYouTube(track.url || "")) {
      const next = !isPlaying
      setIsPlaying(next); setMusicIsPlaying(next)
      if (next) {
        setNowPlayingTrack({ title: track.title, artist: track.artist, emoji: track.emoji, color: track.color })
        // M5: show dedication toast
        if (track.dedication) setTimeout(() => toast(track.dedication!, { icon: "💌", duration: 5000 }), 800)
      }
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
        setIsPlaying(true); setMusicIsPlaying(true)
        setNowPlayingTrack({ title: track.title, artist: track.artist, emoji: track.emoji, color: track.color })
        // M5: show dedication toast
        if (track.dedication) setTimeout(() => toast(track.dedication!, { icon: "💌", duration: 5000 }), 800)
      }).catch(() => setIsPlaying(true))
    }
  }, [track, isPlaying, setNowPlayingTrack, setMusicIsPlaying])

  useEffect(() => {
    const handler = () => togglePlay()
    window.addEventListener("ttd:music:toggle", handler)
    return () => window.removeEventListener("ttd:music:toggle", handler)
  }, [togglePlay])

  function clearTrackForm() {
    setNewTitle(""); setNewArtist(""); setNewUrl(""); setNewEmoji("🎵")
    setNewColor(COLOR_OPTIONS[0]); setNewDedication("")
  }

  function startEditTrack(t: Track) {
    setEditingTrack(t)
    setNewTitle(t.title)
    setNewArtist(t.artist)
    setNewUrl(t.url)
    setNewEmoji(t.emoji)
    setNewColor(t.color)
    setNewDedication(t.dedication ?? "")
    setView("addTrack")
  }

  function cancelEditTrack() {
    setEditingTrack(null)
    clearTrackForm()
    setView("player")
  }

  function addTrack() {
    if (!newTitle.trim()) return
    if (editingTrack) {
      // Save edit
      const updated = playlists.map((pl, i) =>
        i === playlistIdx
          ? {
              ...pl,
              tracks: pl.tracks.map((t) =>
                t.id === editingTrack.id
                  ? {
                      ...t,
                      title: newTitle.trim(),
                      artist: newArtist.trim() || "Artista desconocido",
                      url: newUrl.trim(),
                      emoji: newEmoji,
                      color: newColor,
                      dedication: newDedication.trim() || undefined,
                    }
                  : t
              ),
            }
          : pl
      )
      persist(updated)
      setEditingTrack(null)
      clearTrackForm()
      setView("player")
      return
    }
    const t: Track = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      artist: newArtist.trim() || "Artista desconocido",
      url: newUrl.trim(),
      emoji: newEmoji,
      color: newColor,
      dedication: newDedication.trim() || undefined,
    }
    persist(playlists.map((pl, i) => i === playlistIdx ? { ...pl, tracks: [...pl.tracks, t] } : pl))
    clearTrackForm()
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
  // M1: extract YouTube thumbnail for cover art background
  const coverThumb = track?.url ? getYtThumb(track.url) : null
  const likedCount = tracks.filter(t => likedTracks.has(t.id)).length

  const MUSIC_DARK_BG = isDark
    ? "linear-gradient(160deg, #0d0d1a 0%, #1a0d26 55%, #0d0d1a 100%)"
    : T.bg
  const MUSIC_HEADER_STYLE: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.75rem 1rem",
    background: isDark ? "linear-gradient(135deg, #1a0d26 0%, #0d0d1a 100%)" : T.surface,
    borderBottom: `1px solid ${isDark ? "rgba(139,92,246,0.2)" : T.border}`,
    flexShrink: 0,
  }
  const MUSIC_BODY_STYLE: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: "0.75rem",
    display: "flex", flexDirection: "column", gap: "0.5rem",
    background: MUSIC_DARK_BG,
  }
  const MUSIC_INPUT: React.CSSProperties = {
    width: "100%", padding: "0.625rem 0.875rem", borderRadius: "12px",
    border: `1.5px solid ${isDark ? "rgba(139,92,246,0.25)" : T.border}`,
    background: T.inputBg,
    color: T.text, fontFamily: "inherit", fontSize: "0.875rem",
    boxSizing: "border-box", outline: "none",
  }
  const MUSIC_BACK: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1.5rem", color: isDark ? "rgba(255,255,255,0.8)" : T.textSub,
    padding: "0 0.25rem", lineHeight: 1,
  }

  // ── PLAYLISTS VIEW ──────────────────────────────────────────────────────────
  if (view === "playlists") return (
    <>
      <div style={MUSIC_HEADER_STYLE}>
        <button style={MUSIC_BACK} onClick={() => setView("player")}>‹</button>
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: T.text }}>🎵 Mis Playlists</span>
      </div>
      <div style={MUSIC_BODY_STYLE}>
        <button
          onClick={() => setView("addPlaylist")}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
            padding: "0.625rem 0.75rem", marginBottom: "0.25rem",
            background: "rgba(139,92,246,0.1)", border: "2px dashed rgba(139,92,246,0.4)",
            borderRadius: "12px", cursor: "pointer",
            fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700, color: "#a78bfa",
          }}
        >
          <Plus size={15} /> Nueva playlist
        </button>
        {playlists.map((pl, i) => {
          const plLiked = pl.tracks.filter(t => likedTracks.has(t.id)).length
          return (
            <button
              key={pl.id} onClick={() => selectPlaylist(i)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem", width: "100%",
                padding: "0.625rem 0.75rem", textAlign: "left",
                background: i === playlistIdx ? "rgba(139,92,246,0.18)" : (isDark ? "rgba(255,255,255,0.05)" : T.surface),
                border: `1.5px solid ${i === playlistIdx ? "rgba(139,92,246,0.5)" : T.border}`,
                borderRadius: "12px", cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1.125rem" }}>🎵</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: i === playlistIdx ? "#a78bfa" : T.text }}>{pl.name}</div>
                <div style={{ fontSize: "0.6875rem", color: T.textMuted }}>
                  {pl.tracks.length} canciones{plLiked > 0 ? ` · ❤️ ${plLiked}` : ""}
                </div>
              </div>
              {playlists.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); deletePlaylist(i) }} style={{ cursor: "pointer", color: T.textMuted, padding: "4px" }}>
                  <Trash2 size={13} />
                </span>
              )}
            </button>
          )
        })}
        {likedCount > 0 && (
          <div style={{
            padding: "0.625rem 0.75rem", borderRadius: "12px", marginTop: "0.25rem",
            background: "rgba(236,72,153,0.1)",
            border: "1.5px solid rgba(236,72,153,0.25)", fontSize: "0.6875rem", color: T.textSub,
          }}>
            ❤️ Tienes <strong style={{ color: "#f9a8d4" }}>{likedCount}</strong> canciones favoritas
          </div>
        )}
      </div>
    </>
  )

  // ── ADD PLAYLIST VIEW ───────────────────────────────────────────────────────
  if (view === "addPlaylist") return (
    <>
      <div style={MUSIC_HEADER_STYLE}>
        <button style={MUSIC_BACK} onClick={() => setView("playlists")}>‹</button>
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: T.text }}>Nueva Playlist</span>
      </div>
      <div style={{ ...MUSIC_BODY_STYLE, gap: "0.75rem" }}>
        <input style={MUSIC_INPUT} placeholder="Nombre de la playlist" value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)} maxLength={50} autoFocus />
        <button
          onClick={addPlaylist} disabled={!newPlaylistName.trim()}
          style={{
            padding: "0.75rem", borderRadius: "12px", border: "none",
            background: newPlaylistName.trim() ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : T.muted,
            color: T.text, fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
            cursor: newPlaylistName.trim() ? "pointer" : "not-allowed", opacity: newPlaylistName.trim() ? 1 : 0.5,
            boxShadow: newPlaylistName.trim() ? "0 4px 16px rgba(139,92,246,0.4)" : "none",
          }}
        >
          Crear Playlist
        </button>
      </div>
    </>
  )

  // ── ADD / EDIT TRACK VIEW ───────────────────────────────────────────────────
  if (view === "addTrack") return (
    <>
      <div style={MUSIC_HEADER_STYLE}>
        <button style={MUSIC_BACK} onClick={editingTrack ? cancelEditTrack : () => setView("player")}>‹</button>
        <span style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: T.text }}>
          {editingTrack ? "✏️ Editar Canción" : "Añadir Canción"}
        </span>
      </div>
      <div style={{ ...MUSIC_BODY_STYLE, gap: "0.625rem" }}>
        <input style={MUSIC_INPUT} placeholder="Título *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={80} autoFocus />
        <input style={MUSIC_INPUT} placeholder="Artista" value={newArtist} onChange={(e) => setNewArtist(e.target.value)} maxLength={60} />
        <input style={MUSIC_INPUT} placeholder="URL de YouTube o MP3 (opcional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
        <input
          style={MUSIC_INPUT}
          placeholder="💌 Dedicatoria (aparece al reproducir, opcional)"
          value={newDedication}
          onChange={(e) => setNewDedication(e.target.value)}
          maxLength={120}
        />
        <p style={{ fontSize: "0.6875rem", color: T.textMuted, margin: 0 }}>
          💡 Pega un enlace de YouTube o una URL directa de MP3. Sin URL la canción es solo visual.
        </p>
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: T.textSub, marginBottom: "0.375rem" }}>Icono</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {EMOJI_OPTIONS.map((e) => (
              <button key={e} onClick={() => setNewEmoji(e)} style={{
                width: "34px", height: "34px", borderRadius: "8px", fontSize: "1.125rem",
                border: `2px solid ${newEmoji === e ? "#8b5cf6" : T.border}`,
                background: newEmoji === e ? "rgba(139,92,246,0.2)" : T.muted,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: T.textSub, marginBottom: "0.375rem" }}>Color del disco</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {COLOR_OPTIONS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)} style={{
                width: "26px", height: "26px", borderRadius: "50%", background: c, cursor: "pointer",
                border: `3px solid ${newColor === c ? "#8b5cf6" : "transparent"}`,
                outline: newColor === c ? "2px solid #a78bfa" : "none", outlineOffset: "2px",
              }} />
            ))}
          </div>
        </div>
        <button
          onClick={addTrack} disabled={!newTitle.trim()}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            padding: "0.75rem", borderRadius: "12px", border: "none",
            background: newTitle.trim() ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : T.muted,
            color: T.text, fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
            cursor: newTitle.trim() ? "pointer" : "not-allowed", opacity: newTitle.trim() ? 1 : 0.5,
            boxShadow: newTitle.trim() ? "0 4px 16px rgba(139,92,246,0.4)" : "none",
          }}
        >
          {editingTrack
            ? <><Pencil size={15} /> Guardar cambios</>
            : <><Plus size={15} /> Añadir Canción</>
          }
        </button>
        {editingTrack && (
          <button
            onClick={cancelEditTrack}
            style={{
              padding: "0.75rem", borderRadius: "12px",
              border: `1.5px solid ${T.border}`, background: T.muted,
              color: T.textSub, fontFamily: "inherit", fontSize: "0.875rem",
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        )}
      </div>
    </>
  )

  // ── PLAYER VIEW ─────────────────────────────────────────────────────────────
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0.625rem 1rem",
        background: track
          ? isDark
            ? `linear-gradient(135deg, ${track.color}30 0%, #0d0d1a 100%)`
            : `linear-gradient(135deg, ${track.color}20 0%, ${T.surface} 100%)`
          : isDark
            ? "linear-gradient(135deg, #1a0d26 0%, #0d0d1a 100%)"
            : T.surface,
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : T.border}`,
        flexShrink: 0, transition: "background 0.5s ease",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: isDark ? "rgba(255,255,255,0.7)" : T.textSub, padding: "0 0.25rem", lineHeight: 1 }}>‹</button>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: T.text }}>
          🎧 {playlist.name}
        </span>
        <button onClick={() => setView("playlists")}
          style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: "4px", display: "flex", flexShrink: 0 }}>
          <ListMusic size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Soft gradient background */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, zIndex: 0,
          background: isDark
            ? (track
                ? `linear-gradient(160deg, ${track.color}40 0%, #0d0d1a 50%, #1a0d26 100%)`
                : "linear-gradient(160deg, #1a0d26 0%, #0d0d1a 60%, #1a0d26 100%)")
            : (track
                ? `linear-gradient(160deg, ${track.color}50 0%, #fdf4ff 50%, #fce7f3 100%)`
                : "linear-gradient(160deg, #ede9fe 0%, #fdf4ff 60%, #fce7f3 100%)"),
        }} />

        <div style={{
          position: "relative", zIndex: 1, flex: 1, overflow: "hidden",
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "0.5rem 0.75rem 0.75rem",
          gap: 0,
        }}>
          {/* YouTube cover thumbnail pill */}
          {coverThumb && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              background: "rgba(0,0,0,0.08)", borderRadius: "999px",
              padding: "3px 10px 3px 4px", marginBottom: "0.375rem",
            }}>
              <img src={coverThumb} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: "var(--foreground-muted)" }}>YouTube</span>
            </div>
          )}

          {/* Vinyl + visualizer */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            {loadingDb
              ? <div style={{ width: "130px", height: "130px", borderRadius: "50%", background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", opacity: 0.5 }}>⏳</div>
              : track
                ? <VinylRecord isPlaying={isPlaying} color={track.color} emoji={track.emoji} transitioning={isTransitioning} />
                : <div style={{ width: "130px", height: "130px", borderRadius: "50%", background: "linear-gradient(135deg, #1c1c1c, #2e2e2e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>🎵</div>
            }
            <AudioVisualizer isPlaying={isPlaying} />
          </div>

          {/* Hidden YouTube iframe */}
          {ytId && isPlaying && (
            <iframe key={ytId}
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0`}
              style={{ width: 1, height: 1, border: "none", position: "absolute", opacity: 0 }}
              allow="autoplay"
            />
          )}

          {/* Track info + like */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginTop: "0.625rem", width: "92%" }}>
            <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
              <h3 style={{
                fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)",
                fontFamily: "'Fredoka', sans-serif", margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {track?.title ?? "Sin canciones"}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: "2px 0 0" }}>
                {track?.artist ?? "Añade una canción para empezar"}
              </p>
              {track?.dedication && (
                <p style={{ fontSize: "0.5625rem", color: "var(--secondary)", margin: "3px 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
                  💌 {track.dedication}
                </p>
              )}
            </div>
            {track && (
              <button onClick={(e) => toggleLike(track.id, e)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0, marginTop: "2px" }}>
                <Heart size={20}
                  fill={likedTracks.has(track.id) ? "#EC4899" : "none"}
                  color={likedTracks.has(track.id) ? "#EC4899" : "var(--foreground-muted)"}
                />
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ width: "86%", marginTop: "0.625rem" }}>
            <div style={{ height: "4px", background: "rgba(0,0,0,0.1)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: (track?.url && !isYouTube(track.url)) ? `${progress}%` : (isPlaying ? "45%" : "0%"),
                background: "linear-gradient(90deg, var(--primary), var(--secondary))",
                borderRadius: "999px",
                transition: isPlaying ? "width 0.5s linear" : "none",
              }} />
            </div>
            {track?.url && !isYouTube(track.url) && duration > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px", fontSize: "0.5625rem", color: "var(--foreground-muted)" }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            )}
          </div>

          {/* Sleep timer badge */}
          {sleepMinutesLeft !== null && (
            <div style={{
              display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.25rem",
              background: "var(--primary-lighter)", borderRadius: "999px", padding: "3px 10px 3px 8px",
              fontSize: "0.625rem", color: "var(--primary)", border: "1px solid var(--primary-light)",
            }}>
              🌙 Para en {sleepMinutesLeft}m
              <button onClick={cancelSleepTimer}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "var(--primary)", opacity: 0.7 }}>
                <X size={11} />
              </button>
            </div>
          )}

          {/* Shuffle / Loop / Sleep */}
          <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {(["shuffle", "loop"] as const).map((ctrl) => {
              const active = ctrl === "shuffle" ? isShuffle : isLoop
              return (
                <button key={ctrl}
                  onClick={() => ctrl === "shuffle" ? setIsShuffle(s => !s) : setIsLoop(l => !l)}
                  style={{
                    padding: "4px 10px", borderRadius: "999px", border: active ? "none" : "1px solid var(--border)",
                    cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700,
                    background: active ? "var(--primary)" : "white",
                    color: active ? "white" : "var(--foreground-muted)",
                    transition: "all 0.15s",
                  }}
                >{ctrl === "shuffle" ? "🔀 Aleatoria" : "🔁 Repetir"}</button>
              )
            })}
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowSleepMenu(!showSleepMenu)}
                style={{
                  padding: "4px 10px", borderRadius: "999px", cursor: "pointer",
                  fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: "4px",
                  background: sleepMinutesLeft !== null ? "var(--primary)" : "white",
                  color: sleepMinutesLeft !== null ? "white" : "var(--foreground-muted)",
                  border: sleepMinutesLeft !== null ? "none" : "1px solid var(--border)",
                  transition: "all 0.15s",
                }}
              >
                <Moon size={11} /> Timer
              </button>
              {showSleepMenu && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                  background: T.surface, borderRadius: "12px", padding: "0.5rem",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 99,
                  display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "100px",
                  border: `1.5px solid ${T.border}`,
                }}>
                  <p style={{ fontSize: "0.625rem", fontWeight: 700, color: T.textMuted, margin: "0 0 2px", textAlign: "center" }}>Parar en...</p>
                  {SLEEP_OPTIONS.map(m => (
                    <button key={m} onClick={() => startSleepTimer(m)}
                      style={{ padding: "0.375rem", borderRadius: "8px", border: "none", background: T.muted, cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: T.text }}>
                      {m} min
                    </button>
                  ))}
                  {sleepMinutesLeft !== null && (
                    <button onClick={cancelSleepTimer}
                      style={{ padding: "0.375rem", borderRadius: "8px", border: "none", background: "#FEE2E2", cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: "#DC2626" }}>
                      Cancelar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Play / skip controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginTop: "0.5rem" }}>
            <button onClick={goPrev}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", display: "flex" }}>
              <SkipBack size={24} />
            </button>
            <button onClick={togglePlay} disabled={!track}
              style={{
                width: "54px", height: "54px", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                border: "none", cursor: "pointer", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 18px rgba(139,92,246,0.4)",
                opacity: track ? 1 : 0.45,
              }}
            >
              {isPlaying ? <Pause size={22} /> : <Play size={22} fill="white" />}
            </button>
            <button onClick={goNext}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", display: "flex" }}>
              <SkipForward size={24} />
            </button>
          </div>

          {/* Track list — fills remaining space */}
          <div style={{ width: "100%", marginTop: "0.75rem", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem", flexShrink: 0 }}>
              <span style={{ fontSize: "0.5625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--foreground-muted)" }}>
                Lista · {tracks.length}{likedCount > 0 ? ` · ❤️ ${likedCount}` : ""}
              </span>
              <button onClick={() => setView("addTrack")}
                style={{
                  display: "flex", alignItems: "center", gap: "3px",
                  background: "var(--primary-lighter)", border: "none", borderRadius: "999px",
                  cursor: "pointer", color: "var(--primary)",
                  padding: "3px 8px", fontFamily: "inherit", fontSize: "0.5625rem", fontWeight: 700,
                }}>
                <Plus size={11} /> Añadir
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", minHeight: 0, borderRadius: "var(--radius-md)", background: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)" }}>
              {tracks.length === 0 && (
                <div style={{ padding: "1.25rem", textAlign: "center" }}>
                  <p style={{ fontSize: "1.25rem", marginBottom: "0.25rem" }}>🎵</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>¡Añade tu primera canción!</p>
                </div>
              )}
              {tracks.map((t, i) => (
                <div key={t.id} onClick={() => goTo(i)} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.5rem 0.625rem", cursor: "pointer",
                  background: trackIdx === i ? "rgba(139,92,246,0.1)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  borderLeft: trackIdx === i ? "3px solid var(--primary)" : "3px solid transparent",
                  transition: "background 0.15s",
                }}>
                  <span style={{
                    fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.625rem",
                    color: trackIdx === i ? "var(--primary)" : "var(--foreground-muted)",
                    width: "14px", textAlign: "center", flexShrink: 0,
                  }}>{i + 1}</span>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                    background: `radial-gradient(circle, #111 0%, #111 18%, ${t.color} 19%, ${t.color} 44%, #1a1a1a 45%)`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.75rem", fontWeight: 600,
                      color: trackIdx === i ? "var(--primary)" : "var(--foreground)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{t.title}</div>
                    {trackIdx === i
                      ? <div style={{ fontSize: "0.5625rem", color: "var(--primary)", fontWeight: 700 }}>▶ Reproduciendo</div>
                      : <div style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>
                          {t.artist}{t.url ? (isYouTube(t.url) ? " · YT" : " · Audio") : ""}
                        </div>
                    }
                  </div>
                  <button onClick={(e) => toggleLike(t.id, e)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "3px", flexShrink: 0, display: "flex" }}>
                    <Heart size={12}
                      fill={likedTracks.has(t.id) ? "#EC4899" : "none"}
                      color={likedTracks.has(t.id) ? "#EC4899" : "var(--foreground-muted)"}
                    />
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", flexShrink: 0 }}>
                    <button onClick={(e) => { e.stopPropagation(); moveTrack(i, "up") }} disabled={i === 0}
                      style={{ background: "none", border: "none", cursor: i > 0 ? "pointer" : "default", color: i > 0 ? "var(--foreground-muted)" : "var(--border)", padding: "1px 4px", fontSize: "0.45rem", lineHeight: 1 }}>▲</button>
                    <button onClick={(e) => { e.stopPropagation(); moveTrack(i, "down") }} disabled={i === tracks.length - 1}
                      style={{ background: "none", border: "none", cursor: i < tracks.length - 1 ? "pointer" : "default", color: i < tracks.length - 1 ? "var(--foreground-muted)" : "var(--border)", padding: "1px 4px", fontSize: "0.45rem", lineHeight: 1 }}>▼</button>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteTrack(t.id) }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "4px", flexShrink: 0, display: "flex", borderRadius: "6px" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <audio ref={audioRef} />
        </div>
      </div>

      <style>{`
        @keyframes vinylSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes vinylEnter {
          from { transform: scale(0.75) rotate(-30deg); opacity: 0.2; }
          to   { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes vizBar {
          from { transform: scaleY(0.25); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </>
  )
}
