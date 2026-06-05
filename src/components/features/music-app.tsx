"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, Heart, Moon, X, Pencil, ChevronLeft, Shuffle, Repeat, ListMusic } from "lucide-react"
import { useAppStore } from "@/stores/app-store"
import { toast } from "sonner"

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

const DEMO_PLAYLIST: Playlist = { id: "default", name: "Nuestra Música 💕", tracks: [] }
const STORAGE_KEY = "ttd_playlists_v2"
const LIKED_KEY = "ttd_liked_tracks_v1"
const EMOJI_OPTIONS = ["🎵", "🎸", "🎹", "🎺", "🎻", "🥁", "💕", "🌹", "💫", "⭐", "🌙", "✨", "🦋", "🌸", "🎶"]
const COLOR_OPTIONS = ["#a2d2ff", "#ffdeeb", "#fce4ec", "#ede9fe", "#fde68a", "#c3e6cb", "#ffd6a5", "#caffbf", "#bde0fe", "#ffc8dd"]
const SLEEP_OPTIONS = [15, 30, 45, 60]

const APP_CSS = `
@keyframes vinylSpin {
  from { transform: rotate(0deg) }
  to   { transform: rotate(360deg) }
}
@keyframes vinylEnter {
  from { transform: scale(0.65) rotate(-30deg); opacity: 0 }
  to   { transform: scale(1) rotate(0deg); opacity: 1 }
}
@keyframes vizBar {
  0%   { transform: scaleY(0.15) }
  100% { transform: scaleY(1) }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(60px) }
  to   { opacity: 1; transform: translateX(0) }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-60px) }
  to   { opacity: 1; transform: translateX(0) }
}
@keyframes musicFadeIn {
  from { opacity: 0; transform: translateY(12px) }
  to   { opacity: 1; transform: translateY(0) }
}
.music-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  border: none;
  padding: 0;
  margin: 0;
  display: block;
}
.music-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(0,0,0,0.5);
  margin-top: -5px;
}
.music-range::-moz-range-thumb {
  width: 14px; height: 14px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
  box-shadow: 0 1px 6px rgba(0,0,0,0.5);
}
.music-range::-webkit-slider-runnable-track { height: 4px; border-radius: 4px; }
.music-range::-moz-range-track { height: 4px; border-radius: 4px; background: transparent; }
`

function loadPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch { /**/ }
  return [DEMO_PLAYLIST]
}
function savePlaylists(p: Playlist[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch { /**/ }
}
function loadLiked(): Set<string> {
  try {
    const raw = localStorage.getItem(LIKED_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch { return new Set() }
}
function saveLiked(s: Set<string>) {
  try { localStorage.setItem(LIKED_KEY, JSON.stringify([...s])) } catch { /**/ }
}
function isYouTube(url: string) { return url.includes("youtube.com") || url.includes("youtu.be") }
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] ?? null
}
function getYtThumb(url: string): string | null {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}
function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return "0:00"
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, "0")}`
}

function VinylRecord({ isPlaying, color, emoji, transitioning, size = 180 }: {
  isPlaying: boolean; color: string; emoji: string; transitioning: boolean; size?: number
}) {
  const center = Math.round(size * 0.37)
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at center,
        #111 0%, #111 10%,
        ${color} 11%, ${color} 24%,
        #1c1c1c 25%, #1c1c1c 28%,
        #2e2e2e 29%, #2e2e2e 33%,
        #1c1c1c 34%, #1c1c1c 38%,
        #2e2e2e 39%, #2e2e2e 43%,
        #1c1c1c 44%, #1c1c1c 48%,
        #2e2e2e 49%, #2e2e2e 53%,
        #1c1c1c 54%, #1c1c1c 58%,
        #2e2e2e 59%, #2e2e2e 63%,
        #1c1c1c 64%
      )`,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative", flexShrink: 0,
      boxShadow: isPlaying
        ? `0 0 0 6px ${color}44, 0 0 40px ${color}66, 0 24px 64px rgba(0,0,0,0.75)`
        : "0 16px 56px rgba(0,0,0,0.65)",
      animation: transitioning ? "vinylEnter 0.35s ease" : isPlaying ? "vinylSpin 3s linear infinite" : "none",
      transition: "box-shadow 0.5s ease",
    }}>
      <div style={{
        width: center, height: center, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: `${(size / 180) * 1.625}rem`,
        boxShadow: "0 2px 14px rgba(0,0,0,0.45)", zIndex: 1,
      }}>{emoji}</div>
      <div style={{ position: "absolute", width: 10, height: 10, borderRadius: "50%", background: "#050505", zIndex: 2 }} />
    </div>
  )
}

function AudioVisualizer({ isPlaying }: { isPlaying: boolean }) {
  const delays =    [0, 0.08, 0.16, 0.24, 0.06, 0.18, 0.10, 0.28, 0.04, 0.20, 0.12, 0.22]
  const durations = [0.50, 0.65, 0.55, 0.70, 0.60, 0.48, 0.72, 0.53, 0.67, 0.58, 0.63, 0.45]
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "22px", marginTop: "8px" }}>
      {delays.map((delay, i) => (
        <div key={i} style={{
          width: "3px", borderRadius: "2px", height: "100%",
          background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.25))",
          transformOrigin: "bottom",
          animation: isPlaying ? `vizBar ${durations[i]}s ease-in-out ${delay}s infinite alternate` : "none",
          transform: isPlaying ? "scaleY(1)" : "scaleY(0.12)",
          opacity: isPlaying ? 0.85 : 0.2,
          transition: "opacity 0.4s, transform 0.4s",
        }} />
      ))}
    </div>
  )
}

type AppView = "player" | "queue" | "playlists" | "addTrack" | "addPlaylist"

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
  const [prevView, setPrevView] = useState<AppView>("player")
  const [loadingDb, setLoadingDb] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [likedTracks, setLikedTracks] = useState<Set<string>>(new Set())
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null)
  const [showSleepMenu, setShowSleepMenu] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const vinylTouchX = useRef(0)

  const [newTitle, setNewTitle] = useState("")
  const [newArtist, setNewArtist] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [newEmoji, setNewEmoji] = useState("🎵")
  const [newColor, setNewColor] = useState(COLOR_OPTIONS[0])
  const [newDedication, setNewDedication] = useState("")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [editingTrack, setEditingTrack] = useState<Track | null>(null)

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
          const hasCustom = local.some(pl => pl.id !== "default")
          setPlaylists(hasCustom ? local : [{ id: "default", name: "Nuestra Música 💕", tracks: [] }])
        }
      } else { setPlaylists(loadPlaylists()) }
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
    } catch { /**/ }
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

  function startSleepTimer(minutes: number) {
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current)
    setSleepMinutesLeft(minutes); setShowSleepMenu(false)
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
        if (track.dedication) setTimeout(() => toast(track.dedication!, { icon: "💌", duration: 5000 }), 800)
      }
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (!track.url) { setIsPlaying(p => !p); return }
    if (isPlaying) {
      audio.pause(); setIsPlaying(false); setMusicIsPlaying(false)
    } else {
      if (audio.src !== track.url) audio.src = track.url
      audio.play().then(() => {
        setIsPlaying(true); setMusicIsPlaying(true)
        setNowPlayingTrack({ title: track.title, artist: track.artist, emoji: track.emoji, color: track.color })
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
    setEditingTrack(t); setNewTitle(t.title); setNewArtist(t.artist)
    setNewUrl(t.url); setNewEmoji(t.emoji); setNewColor(t.color)
    setNewDedication(t.dedication ?? "")
    setPrevView(view); setView("addTrack")
  }

  function cancelEditTrack() {
    setEditingTrack(null); clearTrackForm(); setView(prevView)
  }

  function addTrack() {
    if (!newTitle.trim()) return
    if (editingTrack) {
      const updated = playlists.map((pl, i) =>
        i === playlistIdx ? {
          ...pl,
          tracks: pl.tracks.map(t => t.id === editingTrack.id
            ? { ...t, title: newTitle.trim(), artist: newArtist.trim() || "Artista desconocido", url: newUrl.trim(), emoji: newEmoji, color: newColor, dedication: newDedication.trim() || undefined }
            : t
          ),
        } : pl
      )
      persist(updated); setEditingTrack(null); clearTrackForm(); setView(prevView)
      return
    }
    const t: Track = {
      id: Date.now().toString(), title: newTitle.trim(),
      artist: newArtist.trim() || "Artista desconocido", url: newUrl.trim(),
      emoji: newEmoji, color: newColor,
      dedication: newDedication.trim() || undefined,
    }
    persist(playlists.map((pl, i) => i === playlistIdx ? { ...pl, tracks: [...pl.tracks, t] } : pl))
    clearTrackForm(); setView(prevView)
  }

  function deleteTrack(tid: string) {
    persist(playlists.map((pl, i) => i === playlistIdx ? { ...pl, tracks: pl.tracks.filter(t => t.id !== tid) } : pl))
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
  const likedCount = tracks.filter(t => likedTracks.has(t.id)).length

  const darkInputStyle: React.CSSProperties = {
    width: "100%", padding: "0.625rem 0.75rem", borderRadius: "10px",
    border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)",
    color: "white", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
  }

  const darkBg = "linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 100%)"

  // ── PLAYLISTS VIEW ──────────────────────────────────────────────────────────
  if (view === "playlists") return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: darkBg, animation: "slideInRight 0.22s ease both" }}>
      <style>{APP_CSS}</style>
      <div style={{ padding: "0.875rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <button onClick={() => setView("player")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", padding: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: "1rem", fontFamily: "'Fredoka', sans-serif" }}>🎵 Mis Playlists</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <button onClick={() => setView("addPlaylist")} style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%", padding: "0.625rem 0.75rem", background: "rgba(255,255,255,0.06)", border: "1.5px dashed rgba(255,255,255,0.25)", borderRadius: "12px", cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
          <Plus size={15} /> Nueva playlist
        </button>
        {playlists.map((pl, i) => {
          const plLiked = pl.tracks.filter(t => likedTracks.has(t.id)).length
          const accentColor = pl.tracks[0]?.color ?? "#a2d2ff"
          return (
            <button key={pl.id} onClick={() => selectPlaylist(i)} style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", padding: "0.75rem", textAlign: "left", background: i === playlistIdx ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${i === playlistIdx ? accentColor + "88" : "rgba(255,255,255,0.1)"}`, borderRadius: "12px", cursor: "pointer", fontFamily: "inherit" }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: `radial-gradient(circle at center, #111 0%, #111 18%, ${accentColor} 19%, ${accentColor} 44%, #1a1a1a 45%)`, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "white" }}>{pl.name}</div>
                <div style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.5)", marginTop: "2px" }}>
                  {pl.tracks.length} canciones{plLiked > 0 ? ` · ❤️ ${plLiked}` : ""}
                </div>
              </div>
              {playlists.length > 1 && (
                <span onClick={(e) => { e.stopPropagation(); deletePlaylist(i) }} style={{ cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "4px" }}>
                  <Trash2 size={14} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── ADD PLAYLIST VIEW ───────────────────────────────────────────────────────
  if (view === "addPlaylist") return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: darkBg, animation: "slideInRight 0.22s ease both" }}>
      <style>{APP_CSS}</style>
      <div style={{ padding: "0.875rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <button onClick={() => setView("playlists")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", padding: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: "1rem", fontFamily: "'Fredoka', sans-serif" }}>Nueva Playlist</span>
      </div>
      <div style={{ flex: 1, padding: "0 1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input style={darkInputStyle} placeholder="Nombre de la playlist" value={newPlaylistName}
          onChange={e => setNewPlaylistName(e.target.value)} maxLength={50} autoFocus />
        <button onClick={addPlaylist} disabled={!newPlaylistName.trim()} style={{ padding: "0.75rem", borderRadius: "12px", background: newPlaylistName.trim() ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "rgba(255,255,255,0.1)", color: "white", border: "none", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", cursor: newPlaylistName.trim() ? "pointer" : "default" }}>
          Crear Playlist
        </button>
      </div>
    </div>
  )

  // ── ADD / EDIT TRACK VIEW ───────────────────────────────────────────────────
  if (view === "addTrack") return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: darkBg, animation: "slideInRight 0.22s ease both" }}>
      <style>{APP_CSS}</style>
      <div style={{ padding: "0.875rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <button onClick={editingTrack ? cancelEditTrack : () => setView(prevView)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", padding: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: "1rem", fontFamily: "'Fredoka', sans-serif" }}>
          {editingTrack ? "✏️ Editar Canción" : "Añadir Canción"}
        </span>
        {/* Mini vinyl preview */}
        <div style={{ marginLeft: "auto", width: 36, height: 36, borderRadius: "50%", flexShrink: 0, background: `radial-gradient(circle at center, #111 0%, #111 18%, ${newColor} 19%, ${newColor} 44%, #1a1a1a 45%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem" }}>
          {newEmoji}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <input style={darkInputStyle} placeholder="Título *" value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={80} autoFocus />
        <input style={darkInputStyle} placeholder="Artista" value={newArtist} onChange={e => setNewArtist(e.target.value)} maxLength={60} />
        <input style={darkInputStyle} placeholder="URL de YouTube o MP3 (opcional)" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
        <input style={darkInputStyle} placeholder="💌 Dedicatoria (opcional)" value={newDedication} onChange={e => setNewDedication(e.target.value)} maxLength={120} />
        <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>
          💡 Pega un enlace de YouTube o una URL directa de MP3.
        </p>

        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Icono</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
            {EMOJI_OPTIONS.map(e => (
              <button key={e} onClick={() => setNewEmoji(e)} style={{ width: 38, height: 38, borderRadius: "10px", fontSize: "1.25rem", border: `2px solid ${newEmoji === e ? "#a78bfa" : "rgba(255,255,255,0.15)"}`, background: newEmoji === e ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.06)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {e}
                {newEmoji === e && <span style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: "50%", background: "#a78bfa", fontSize: "0.4rem", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: "0.375rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Color del disco</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {COLOR_OPTIONS.map(c => (
              <button key={c} onClick={() => setNewColor(c)} style={{ width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer", border: `3px solid ${newColor === c ? "white" : "transparent"}`, boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none", transition: "all 0.15s" }} />
            ))}
          </div>
        </div>

        <button onClick={addTrack} disabled={!newTitle.trim()} style={{ padding: "0.75rem", borderRadius: "12px", background: newTitle.trim() ? "linear-gradient(135deg, #7c3aed, #ec4899)" : "rgba(255,255,255,0.1)", color: "white", border: "none", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", cursor: newTitle.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          {editingTrack ? <><Pencil size={15} /> Guardar cambios</> : <><Plus size={15} /> Añadir Canción</>}
        </button>
        {editingTrack && (
          <button onClick={cancelEditTrack} style={{ padding: "0.625rem", borderRadius: "12px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1.5px solid rgba(255,255,255,0.12)", fontWeight: 600, fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer" }}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )

  // ── QUEUE VIEW ──────────────────────────────────────────────────────────────
  if (view === "queue") return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: track ? `radial-gradient(ellipse at 20% 10%, ${track.color}33 0%, transparent 50%), ${darkBg}` : darkBg, animation: "slideInRight 0.22s ease both" }}>
      <style>{APP_CSS}</style>
      <div style={{ padding: "0.875rem 1rem 0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <button onClick={() => setView("player")} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", display: "flex", padding: 0 }}>
          <ChevronLeft size={22} />
        </button>
        <span style={{ color: "white", fontWeight: 700, fontSize: "1rem", fontFamily: "'Fredoka', sans-serif", flex: 1 }}>
          📋 Cola · {tracks.length} canción{tracks.length !== 1 ? "es" : ""}
          {likedCount > 0 ? ` · ❤️ ${likedCount}` : ""}
        </span>
        <button onClick={() => { setPrevView("queue"); setView("addTrack") }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "999px", padding: "0.25rem 0.75rem", color: "white", fontSize: "0.6875rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <Plus size={12} /> Añadir
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem 1rem" }}>
        {tracks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "rgba(255,255,255,0.4)" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎵</div>
            <p style={{ fontSize: "0.875rem" }}>La cola está vacía</p>
            <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>Añade tu primera canción</p>
          </div>
        ) : tracks.map((t, i) => (
          <div key={t.id} onClick={() => { goTo(i); setView("player") }} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.625rem", borderRadius: "12px", marginBottom: "0.25rem", cursor: "pointer", background: trackIdx === i ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", borderLeft: `3px solid ${trackIdx === i ? (t.color ?? "#a78bfa") : "transparent"}`, transition: "background 0.15s" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `radial-gradient(circle at center, #111 0%, #111 18%, ${t.color} 19%, ${t.color} 44%, #1a1a1a 45%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.875rem" }}>
              {trackIdx === i && isPlaying ? "▶" : t.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: trackIdx === i ? 700 : 600, color: trackIdx === i ? "white" : "rgba(255,255,255,0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
              <div style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.45)", marginTop: "1px" }}>
                {trackIdx === i ? <span style={{ color: t.color ?? "#a78bfa", fontWeight: 700 }}>▶ Ahora</span> : t.artist}
                {t.url ? <span style={{ marginLeft: "0.375rem", padding: "1px 5px", borderRadius: "4px", background: "rgba(255,255,255,0.1)", fontSize: "0.5625rem" }}>{isYouTube(t.url) ? "YT" : "MP3"}</span> : null}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
              <button onClick={e => toggleLike(t.id, e)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}>
                <Heart size={13} fill={likedTracks.has(t.id) ? "#EC4899" : "none"} color={likedTracks.has(t.id) ? "#EC4899" : "rgba(255,255,255,0.35)"} />
              </button>
              <button onClick={e => { e.stopPropagation(); startEditTrack(t) }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", color: "rgba(255,255,255,0.35)" }}>
                <Pencil size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); deleteTrack(t.id) }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex", color: "rgba(255,255,255,0.35)" }}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── PLAYER VIEW (NOW PLAYING) ────────────────────────────────────────────────
  const bgGradient = track
    ? `radial-gradient(ellipse at 25% 15%, ${track.color}55 0%, transparent 55%),
       radial-gradient(ellipse at 75% 85%, ${track.color}33 0%, transparent 50%),
       linear-gradient(160deg, #0f0f1a 0%, #1a0f2e 100%)`
    : darkBg

  const isMp3WithDuration = track?.url && !isYouTube(track.url) && duration > 0

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: bgGradient, transition: "background 0.8s ease", position: "relative", overflow: "hidden" }}>
      <style>{APP_CSS}</style>

      {/* Hidden YouTube iframe */}
      {ytId && isPlaying && (
        <iframe key={ytId} src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0`}
          style={{ width: 1, height: 1, border: "none", position: "absolute", opacity: 0 }} allow="autoplay" />
      )}
      <audio ref={audioRef} />

      {/* Header */}
      <div style={{ padding: "0.75rem 1rem 0.5rem", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0, zIndex: 2 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.65)", display: "flex", padding: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div style={{ flex: 1, minWidth: 0, textAlign: "center" }}>
          <p style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.45)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Reproduciendo de</p>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.8)", margin: 0, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playlist.name}</p>
        </div>
        <button onClick={() => { setPrevView("player"); setView("queue") }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "999px", padding: "0.25rem 0.625rem", color: "rgba(255,255,255,0.8)", fontSize: "0.625rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <ListMusic size={12} /> Cola
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 1.25rem 0.75rem", gap: 0, overflowY: "auto", zIndex: 2 }}>

        {/* Vinyl — swipeable */}
        <div
          style={{ marginTop: "0.5rem", cursor: "pointer" }}
          onTouchStart={e => { vinylTouchX.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            const dx = e.changedTouches[0].clientX - vinylTouchX.current
            if (dx > 50) goPrev()
            else if (dx < -50) goNext()
          }}
        >
          {loadingDb
            ? <div style={{ width: 180, height: 180, borderRadius: "50%", background: "#1c1c1c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", opacity: 0.4 }}>⏳</div>
            : track
              ? <VinylRecord isPlaying={isPlaying} color={track.color} emoji={track.emoji} transitioning={isTransitioning} size={180} />
              : <div style={{ width: 180, height: 180, borderRadius: "50%", background: "linear-gradient(135deg, #1c1c1c, #2e2e2e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem" }}>🎵</div>
          }
        </div>

        <AudioVisualizer isPlaying={isPlaying} />

        {/* Track info */}
        <div style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "0.5rem", marginTop: "1rem", animation: "musicFadeIn 0.4s ease both" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1.25rem", color: "white", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track?.title ?? "Sin canciones"}
            </h3>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.55)", margin: "3px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {track?.artist ?? "Añade una canción para empezar"}
            </p>
            {track?.dedication && (
              <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.45)", margin: "4px 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
                💌 {track.dedication}
              </p>
            )}
          </div>
          {track && (
            <button onClick={e => toggleLike(track.id, e)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0, marginTop: "2px" }}>
              <Heart size={22} fill={likedTracks.has(track.id) ? "#EC4899" : "none"} color={likedTracks.has(track.id) ? "#EC4899" : "rgba(255,255,255,0.4)"} />
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", marginTop: "1rem" }}>
          {isMp3WithDuration ? (
            <>
              <input
                type="range" className="music-range"
                min={0} max={duration} value={currentTime} step={0.1}
                style={{ background: `linear-gradient(to right, rgba(255,255,255,0.9) ${progress}%, rgba(255,255,255,0.2) ${progress}%)` }}
                onChange={e => {
                  const v = Number(e.target.value)
                  if (audioRef.current) audioRef.current.currentTime = v
                  setCurrentTime(v)
                  setProgress(duration ? (v / duration) * 100 : 0)
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.5625rem", color: "rgba(255,255,255,0.4)" }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: isPlaying ? "45%" : `${progress}%`, background: track ? `linear-gradient(90deg, ${track.color}, rgba(255,255,255,0.6))` : "rgba(255,255,255,0.4)", borderRadius: 4, transition: isPlaying ? "none" : "width 0.3s" }} />
              </div>
              {track?.url && isYouTube(track.url) && (
                <p style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", textAlign: "center", margin: "3px 0 0" }}>YouTube — control de tiempo no disponible</p>
              )}
            </>
          )}
        </div>

        {/* Sleep timer badge */}
        {sleepMinutesLeft !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem", background: "rgba(255,255,255,0.1)", borderRadius: "999px", padding: "3px 10px 3px 8px", fontSize: "0.625rem", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.15)" }}>
            🌙 Para en {sleepMinutesLeft}m
            <button onClick={cancelSleepTimer} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "rgba(255,255,255,0.6)" }}>
              <X size={11} />
            </button>
          </div>
        )}

        {/* Main controls: shuffle | prev | play | next | loop */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginTop: "1rem" }}>
          <button onClick={() => setIsShuffle(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", opacity: isShuffle ? 1 : 0.4, color: isShuffle ? (track?.color ?? "#a78bfa") : "white", transition: "all 0.2s" }}>
            <Shuffle size={20} />
          </button>
          <button onClick={goPrev} disabled={tracks.length === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "white", display: "flex", opacity: tracks.length > 0 ? 0.8 : 0.3 }}>
            <SkipBack size={26} fill="white" />
          </button>
          <button onClick={togglePlay} disabled={!track} style={{ width: 62, height: 62, borderRadius: "50%", background: track ? `linear-gradient(135deg, ${track?.color ?? "#a78bfa"}, #ec4899)` : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: track && isPlaying ? `0 0 28px ${track.color}88, 0 8px 24px rgba(0,0,0,0.5)` : "0 8px 24px rgba(0,0,0,0.4)", opacity: track ? 1 : 0.4, transition: "box-shadow 0.4s, background 0.4s" }}>
            {isPlaying ? <Pause size={26} /> : <Play size={26} fill="white" />}
          </button>
          <button onClick={goNext} disabled={tracks.length === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "white", display: "flex", opacity: tracks.length > 0 ? 0.8 : 0.3 }}>
            <SkipForward size={26} fill="white" />
          </button>
          <button onClick={() => setIsLoop(l => !l)} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", opacity: isLoop ? 1 : 0.4, color: isLoop ? (track?.color ?? "#a78bfa") : "white", transition: "all 0.2s" }}>
            <Repeat size={20} />
          </button>
        </div>

        {/* Secondary row: sleep + playlists */}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem", position: "relative" }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSleepMenu(!showSleepMenu)} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", borderRadius: "999px", background: sleepMinutesLeft !== null ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontSize: "0.6875rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
              <Moon size={13} /> {sleepMinutesLeft !== null ? `${sleepMinutesLeft}m` : "Sleep"}
            </button>
            {showSleepMenu && (
              <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1e1e2e", borderRadius: "14px", padding: "0.625rem", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 99, display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "110px", border: "1px solid rgba(255,255,255,0.12)" }}>
                <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>Parar en...</p>
                {SLEEP_OPTIONS.map(m => (
                  <button key={m} onClick={() => startSleepTimer(m)} style={{ padding: "0.4rem", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.08)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: "white" }}>
                    {m} min
                  </button>
                ))}
                {sleepMinutesLeft !== null && (
                  <button onClick={cancelSleepTimer} style={{ padding: "0.4rem", borderRadius: "8px", border: "none", background: "rgba(220,38,38,0.2)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700, color: "#f87171" }}>
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={() => setView("playlists")} style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", borderRadius: "999px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontSize: "0.6875rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🎵 Playlists
          </button>
        </div>

      </div>
    </div>
  )
}
