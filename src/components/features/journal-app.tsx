"use client"

import { useState, useEffect, useRef } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { JournalEntry, Letter } from "@/types"
import { Lock, Unlock, Flame, Smile, Heart, Laugh, Frown, Meh, Moon, User, Camera, Mail, FileText, CheckCircle2, PenLine, Search as SearchIcon, BarChart2, Mic, MicOff, Square, Trash2 } from "lucide-react"

const MOODS = [
  { id: "happy",    Icon: Smile,  label: "Feliz",       accent: "#FEF3C7", accentBorder: "#F59E0B", accentText: "#92400E" },
  { id: "love",     Icon: Heart,  label: "Enamorado/a", accent: "#FCE7F3", accentBorder: "#EC4899", accentText: "#9D174D" },
  { id: "fun",      Icon: Laugh,  label: "Divertido",   accent: "#FED7AA", accentBorder: "#F97316", accentText: "#7C2D12" },
  { id: "romantic", Icon: Heart,  label: "Romántico",   accent: "#FFE4E6", accentBorder: "#F43F5E", accentText: "#881337" },
  { id: "chill",    Icon: Meh,    label: "Tranquilo",   accent: "#E0F2FE", accentBorder: "#0284C7", accentText: "#075985" },
  { id: "sad",      Icon: Frown,  label: "Triste",      accent: "#DBEAFE", accentBorder: "#3B82F6", accentText: "#1E40AF" },
]

const MOOD_EMOJI_TO_ID: Record<string, string> = {
  "😊": "happy", "🥰": "love", "😄": "fun", "💕": "romantic", "😌": "chill", "😢": "sad",
}

function getMoodById(idOrEmoji: string | null | undefined) {
  if (!idOrEmoji) return null
  const mapped = MOOD_EMOJI_TO_ID[idOrEmoji] ?? idOrEmoji
  return MOODS.find(m => m.id === mapped) ?? null
}

function readJournalSettings() {
  try {
    const raw = localStorage.getItem("ttd_settings_v1")
    if (!raw) return { weekStartsMonday: false, privateJournal: false }
    const s = JSON.parse(raw)
    return { weekStartsMonday: !!s.weekStartsMonday, privateJournal: !!s.privateJournal }
  } catch { return { weekStartsMonday: false, privateJournal: false } }
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function subtractDay(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() - days)
  return toLocalDateStr(d)
}

const ES_DAYS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]
const ES_MONTHS = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]

function formatDateEs(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const dow = ES_DAYS[d.getDay()]
  const day = d.getDate()
  const month = ES_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  return `${dow.charAt(0).toUpperCase() + dow.slice(1)}, ${day} de ${month} ${year}`
}

function formatDateShortEs(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const dow = ES_DAYS[d.getDay()]
  const day = d.getDate()
  const month = ES_MONTHS[d.getMonth()]
  return `${dow.charAt(0).toUpperCase() + dow.slice(1)}, ${day} de ${month}`
}

// ── Streak calculation helpers ────────────────────────────────────────────────

function calculateStreak(entries: JournalEntry[], myUid: string): number {
  if (!myUid) return 0
  const myDates = new Set<string>()
  const partnerDates = new Set<string>()
  for (const e of entries) {
    if (e.created_by === myUid) myDates.add(e.date)
    else partnerDates.add(e.date)
  }
  const bothDates = new Set<string>()
  for (const d of myDates) { if (partnerDates.has(d)) bothDates.add(d) }
  if (bothDates.size === 0) return 0
  const todayStr = toLocalDateStr(new Date())
  const yesterdayStr = subtractDay(todayStr, 1)
  const startDate = bothDates.has(todayStr) ? todayStr : yesterdayStr
  if (!bothDates.has(startDate)) return 0
  let streak = 0
  let current = startDate
  while (bothDates.has(current)) { streak++; current = subtractDay(current, 1) }
  return streak
}

function calculateMaxStreak(entries: JournalEntry[], myUid: string): number {
  if (!myUid || entries.length === 0) return 0
  const myDates = new Set<string>()
  const partnerDates = new Set<string>()
  for (const e of entries) {
    if (e.created_by === myUid) myDates.add(e.date)
    else partnerDates.add(e.date)
  }
  const bothDates = Array.from(myDates).filter(d => partnerDates.has(d)).sort()
  if (bothDates.length === 0) return 0
  let max = 1, cur = 1
  for (let i = 1; i < bothDates.length; i++) {
    const prev = new Date(bothDates[i-1] + "T12:00:00")
    const curr = new Date(bothDates[i] + "T12:00:00")
    const diff = (curr.getTime() - prev.getTime()) / 86400000
    if (diff === 1) { cur++; max = Math.max(max, cur) } else { cur = 1 }
  }
  return max
}

function getTodayStatus(entries: JournalEntry[], myUid: string): "both" | "onlyme" | "none" {
  const todayStr = toLocalDateStr(new Date())
  const iWrote = entries.some(e => e.date === todayStr && e.created_by === myUid)
  const partnerWrote = entries.some(e => e.date === todayStr && e.created_by !== myUid)
  if (iWrote && partnerWrote) return "both"
  if (iWrote) return "onlyme"
  return "none"
}

// ── PIN helpers ───────────────────────────────────────────────────────────────

const PIN_KEY = "ttd_journal_pin_v1"

function getStoredPin(): string | null {
  try { return localStorage.getItem(PIN_KEY) } catch { return null }
}

// ── Writing prompts ──────────────────────────────────────────────────────────

const PROMPTS = [
  "¿Cuál fue el mejor momento de hoy?",
  "¿Qué te hizo sonreír hoy?",
  "¿Qué aprendiste de ti mismo/a hoy?",
  "¿Qué quieres recordar de este día?",
  "¿Cómo te hizo sentir tu pareja hoy?",
  "¿Qué hicieron juntos hoy?",
  "¿Qué es lo que más aprecias de tu relación?",
  "Describe el día en 3 palabras...",
]

interface Props { onBack: () => void }
type View = "calendar" | "read" | "write" | "timeline" | "letters" | "letters-compose" | "letter-read" | "stats"
type GetUserMediaLegacy = (
  constraints: MediaStreamConstraints,
  success: (stream: MediaStream) => void,
  error: (err: unknown) => void,
) => void

// ── Voice recording hook ──────────────────────────────────────────────────────

export function JournalApp({ onBack }: Props) {
  const { user } = useAuth()
  const myUid = user?.uid ?? ""
  const [view, setView] = useState<View>("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [lastYearEntries, setLastYearEntries] = useState<JournalEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [writeContent, setWriteContent] = useState("")
  const [writeMood, setWriteMood] = useState("happy")
  const [saving, setSaving] = useState(false)
  const [showPartnerEntry, setShowPartnerEntry] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [weekStartsMonday, setWeekStartsMonday] = useState(false)
  const [privateJournal, setPrivateJournal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [viewingPartner, setViewingPartner] = useState(false)
  const photoFileRef = useRef<HTMLInputElement>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSecs, setRecordingSecs] = useState(0)
  const [showMicHelp, setShowMicHelp] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [dismissedOnThisDay, setDismissedOnThisDay] = useState(false)

  // Letters state
  const [letters, setLetters] = useState<Letter[]>([])
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null)
  const [letterSubject, setLetterSubject] = useState("")
  const [letterContent, setLetterContent] = useState("")
  const [sendingLetter, setSendingLetter] = useState(false)

  // ── PIN state ──────────────────────────────────────────────────────────────
  const [pinRequired, setPinRequired] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState("")
  const [pinShake, setPinShake] = useState(false)
  const [pinSuccess, setPinSuccess] = useState(false)
  const pinHiddenRef = useRef<HTMLInputElement>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const s = readJournalSettings()
    setWeekStartsMonday(s.weekStartsMonday)
    setPrivateJournal(s.privateJournal)
    const stored = getStoredPin()
    if (stored) setPinRequired(true)
  }, [])

  useEffect(() => { loadEntries() }, [month, year])

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function getToken() {
    const auth = getFirebaseAuth()
    return await auth.currentUser?.getIdToken()
  }

  async function loadEntries() {
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/journal?year=${year}&month=${month + 1}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data: JournalEntry[] = await res.json()
      setEntries(data)

      // Feature 4: load last year's same month for "on this day"
      const lyRes = await fetch(`/api/journal?year=${year - 1}&month=${month + 1}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (lyRes.ok) setLastYearEntries(await lyRes.json())
    } catch { /* silently fail */ }
  }

  async function loadLetters() {
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch("/api/letters", { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      setLetters(await res.json())
    } catch { /* silently fail */ }
  }

  function getMyEntry(dateStr: string) {
    return entries.find((e) => e.date === dateStr && e.created_by === myUid)
  }

  function getPartnerEntry(dateStr: string) {
    return entries.find((e) => e.date === dateStr && e.created_by !== myUid)
  }

  function openDay(dateStr: string) {
    setSelectedDate(dateStr)
    setShowPartnerEntry(false)
    setIsEditing(false)
    const myEntry = getMyEntry(dateStr)
    if (myEntry) {
      setSelectedEntry(myEntry)
      setView("read")
    } else {
      setSelectedEntry(null)
      setWriteContent("")
      setWriteMood("happy")
      setPhotoUrls([])
      setAudioUrl(null)
      setView("write")
    }
  }

  function startEdit(entry: JournalEntry) {
    setWriteContent(entry.content)
    setWriteMood(entry.mood ?? "happy")
    setPhotoUrls(entry.photos ?? [])
    setAudioUrl(entry.audio_url ?? null)
    setIsEditing(true)
    setView("write")
  }

  async function saveEntry() {
    if (!selectedDate || !writeContent.trim()) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("Not authenticated")
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: selectedDate, content: writeContent.trim(), mood: writeMood, photos: photoUrls, audio_url: audioUrl }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success(isEditing ? "Entrada actualizada ✏️" : "Entrada guardada 💕")
      try { localStorage.setItem("ttd_last_journal_date", new Date().toISOString()) } catch { /* */ }
      await loadEntries()
      setView("calendar")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  function fmtSecs(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
  }

  function beginRecordingWithStream(stream: MediaStream) {
    streamRef.current = stream
    const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(t => {
      try { return MediaRecorder.isTypeSupported(t) } catch { return false }
    }) ?? ""
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = mr
    chunksRef.current = []
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" })
      await uploadAudioBlob(blob, mimeType)
    }
    mr.start(250)
    setIsRecording(true)
    setRecordingSecs(0)
    recordingTimerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000)
  }

  // Resolve getUserMedia across older WebViews that expose it in legacy locations
  function getUserMediaCompat(constraints: MediaStreamConstraints): Promise<MediaStream> {
    const md = navigator.mediaDevices
    if (md && typeof md.getUserMedia === "function") {
      return md.getUserMedia(constraints)
    }
    // Legacy fallback (very old WebViews)
    const legacy = (navigator as unknown as {
      getUserMedia?: GetUserMediaLegacy
      webkitGetUserMedia?: GetUserMediaLegacy
      mozGetUserMedia?: GetUserMediaLegacy
    })
    const gum = legacy.getUserMedia || legacy.webkitGetUserMedia || legacy.mozGetUserMedia
    if (!gum) return Promise.reject(new DOMException("getUserMedia not supported", "NotSupportedError"))
    return new Promise((resolve, reject) => gum.call(navigator, constraints, resolve, reject))
  }

  async function startRecording(isRetry = false) {
    setShowMicHelp(false)
    try {
      // Call getUserMedia directly — the native layer (MainActivity) requests the
      // Android mic permission and grants the WebView request. Don't pre-check the
      // permissions API: inside a WebView it can wrongly report 'denied'.
      const stream = await getUserMediaCompat({ audio: true, video: false })
      beginRecordingWithStream(stream)
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : ""
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        // On Android the runtime permission dialog resolves asynchronously, so the
        // first getUserMedia often rejects right as the user taps "Permitir".
        // Retry once automatically after a short delay before showing the help panel.
        if (!isRetry) {
          await new Promise(r => setTimeout(r, 1300))
          return startRecording(true)
        }
        setShowMicHelp(true)
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("No se encontró micrófono en este dispositivo")
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        toast.error("El micrófono está siendo usado por otra app. Ciérrala e intenta de nuevo")
      } else if (name === "NotSupportedError") {
        // getUserMedia unavailable — almost always an insecure (non-HTTPS) context
        if (!isRetry) {
          await new Promise(r => setTimeout(r, 800))
          return startRecording(true)
        }
        toast.error("Tu dispositivo no permite grabar aquí. Actualiza la app a la última versión")
      } else {
        toast.error(`No se pudo acceder al micrófono${name ? ` (${name})` : ""}`)
      }
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  async function uploadAudioBlob(blob: Blob, mimeType: string) {
    if (!selectedDate) return
    if (!blob || blob.size === 0) { toast.error("La grabación quedó vacía, intenta de nuevo"); return }
    setUploadingAudio(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth")
      const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm"
      const fd = new FormData()
      fd.append("file", blob, `voz-${selectedDate}.${ext}`)
      fd.append("date", selectedDate)
      const res = await fetch("/api/upload/audio", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => null)
        throw new Error(msg?.error ?? "Error al subir")
      }
      const { url } = await res.json()
      setAudioUrl(url)
      toast.success("Nota de voz añadida 🎙️")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al subir el audio")
    } finally {
      setUploadingAudio(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploadingPhoto(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth")
      const urls: string[] = []
      for (const file of files) {
        const fd = new FormData()
        fd.append("file", file)
        const res = await fetch("/api/photos", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        if (!res.ok) throw new Error("Error al subir foto")
        const data = await res.json()
        urls.push(data.image_url)
      }
      setPhotoUrls(prev => [...prev, ...urls])
      toast.success(`${urls.length} foto${urls.length > 1 ? "s" : ""} añadida${urls.length > 1 ? "s" : ""} 📷`)
    } catch {
      toast.error("Error al subir foto")
    } finally {
      setUploadingPhoto(false)
      if (photoFileRef.current) photoFileRef.current.value = ""
    }
  }

  async function sendLetter() {
    if (!letterContent.trim()) return
    setSendingLetter(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth")
      const res = await fetch("/api/letters", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: letterSubject, content: letterContent }),
      })
      if (!res.ok) throw new Error("Error al enviar")
      toast.success("Carta enviada 💌")
      setLetterSubject("")
      setLetterContent("")
      await loadLetters()
      setView("letters")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSendingLetter(false) }
  }

  async function openLetter(letter: Letter) {
    setSelectedLetter(letter)
    setView("letter-read")
    if (!letter.is_read && letter.from_user_id !== myUid) {
      try {
        const token = await getToken()
        if (!token) return
        await fetch(`/api/letters/${letter.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_read: true }),
        })
        setLetters(prev => prev.map(l => l.id === letter.id ? { ...l, is_read: true } : l))
      } catch { /* silently */ }
    }
  }

  async function deleteLetter(id: string) {
    try {
      const token = await getToken()
      if (!token) return
      await fetch(`/api/letters/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setLetters(prev => prev.filter(l => l.id !== id))
      setView("letters")
      toast.success("Carta eliminada")
    } catch { toast.error("Error al eliminar") }
  }

  // ── PIN handlers ──────────────────────────────────────────────────────────
  function handlePinKeyPress(digit: string) {
    if (pinInput.length >= 4) return
    const next = pinInput + digit
    setPinInput(next)
    if (next.length === 4) {
      const stored = getStoredPin()
      if (next === stored) {
        setPinSuccess(true)
        setTimeout(() => { setPinUnlocked(true); setPinRequired(false); setPinInput(""); setPinSuccess(false) }, 600)
      } else {
        setPinShake(true)
        setTimeout(() => { setPinShake(false); setPinInput("") }, 700)
      }
    }
  }

  function handlePinBackspace() { setPinInput(prev => prev.slice(0, -1)) }

  // ── PIN lock screen ────────────────────────────────────────────────────────
  if (pinRequired && !pinUnlocked) {
    return (
      <>
        <style>{`
          @keyframes pinShake {
            0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(8px)}
            45%{transform:translateX(-6px)} 60%{transform:translateX(6px)} 75%{transform:translateX(-4px)} 90%{transform:translateX(4px)}
          }
          @keyframes pinPop {
            0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1}
          }
        `}</style>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={onBack}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><Lock size={16} /> Diario Privado</span>
        </div>
        <div className="app-content-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", paddingTop: "2rem" }}>
          <div style={{ animation: pinSuccess ? "pinPop 0.5s ease" : undefined, color: pinSuccess ? "#10b981" : "var(--primary)" }}>
            {pinSuccess ? <Unlock size={56} /> : <Lock size={56} />}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>Diario privado</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>Ingresa tu PIN para continuar</p>
          </div>
          <div style={{ display: "flex", gap: "0.875rem", animation: pinShake ? "pinShake 0.7s ease" : undefined }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid", borderColor: pinShake ? "#ef4444" : pinSuccess ? "#10b981" : "var(--primary)", background: pinInput.length > i ? (pinShake ? "#ef4444" : pinSuccess ? "#10b981" : "var(--primary)") : "transparent", transition: "background 0.15s, border-color 0.15s" }} />
            ))}
          </div>
          <input ref={pinHiddenRef} type="tel" inputMode="numeric" maxLength={4} value={pinInput}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 4)
              setPinInput(val)
              if (val.length === 4) {
                const stored = getStoredPin()
                if (val === stored) { setPinSuccess(true); setTimeout(() => { setPinUnlocked(true); setPinRequired(false); setPinInput(""); setPinSuccess(false) }, 600) }
                else { setPinShake(true); setTimeout(() => { setPinShake(false); setPinInput("") }, 700) }
              }
            }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem", width: "100%", maxWidth: 240 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} onClick={() => handlePinKeyPress(String(n))}
                style={{ aspectRatio: "1", borderRadius: "50%", border: "2px solid var(--border)", background: "white", cursor: "pointer", fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", transition: "background 0.1s, transform 0.1s" }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >{n}</button>
            ))}
            <div />
            <button onClick={() => handlePinKeyPress("0")}
              style={{ aspectRatio: "1", borderRadius: "50%", border: "2px solid var(--border)", background: "white", cursor: "pointer", fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 600, color: "var(--foreground)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", transition: "background 0.1s, transform 0.1s" }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >0</button>
            <button onClick={handlePinBackspace}
              style={{ aspectRatio: "1", borderRadius: "50%", border: "2px solid var(--border)", background: "white", cursor: "pointer", fontSize: "1.125rem", color: "var(--foreground-light)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", transition: "background 0.1s, transform 0.1s" }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >⌫</button>
          </div>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8125rem", color: "var(--foreground-muted)", fontFamily: "inherit", textDecoration: "underline", marginTop: "0.25rem" }}>
            Cancelar
          </button>
        </div>
      </>
    )
  }

  // ── Calendar calculations ──────────────────────────────────────────────────
  const rawFirstDay = new Date(year, month, 1).getDay()
  const firstDay = weekStartsMonday ? (rawFirstDay + 6) % 7 : rawFirstDay
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = `${currentDate.toLocaleString("es-ES", { month: "long" })} ${year}`
  const weekDays = weekStartsMonday
    ? ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]
    : ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"]

  const streak = calculateStreak(entries, myUid)
  const todayStatus = getTodayStatus(entries, myUid)

  // Feature 4: "On this day" — find entry from last year same month+day
  const todayStr = toLocalDateStr(new Date())
  const todayMMDD = todayStr.slice(5) // MM-DD
  const onThisDayEntry = lastYearEntries.find(e => e.date.slice(5) === todayMMDD && e.created_by === myUid) ?? null

  // Feature 2: unread count
  const unreadCount = letters.filter(l => !l.is_read && l.from_user_id !== myUid).length

  // ── STATS view ─────────────────────────────────────────────────────────────
  if (view === "stats") {
    const myEntries = entries.filter(e => e.created_by === myUid)
    const partnerEntries = entries.filter(e => e.created_by !== myUid)

    // Mood counts for my entries
    const moodCounts: Record<string, number> = {}
    for (const m of MOODS) moodCounts[m.id] = 0
    for (const e of myEntries) {
      const mid = MOOD_EMOJI_TO_ID[e.mood ?? ""] ?? e.mood ?? ""
      if (moodCounts[mid] !== undefined) moodCounts[mid]++
    }
    const maxMoodCount = Math.max(...Object.values(moodCounts), 1)

    // Max streak
    const maxStreak = calculateMaxStreak(entries, myUid)

    // Most active month — from all loaded entries
    const monthCounts: Record<string, number> = {}
    for (const e of entries) {
      const m = e.date.slice(0, 7)
      monthCounts[m] = (monthCounts[m] ?? 0) + 1
    }
    const mostActiveMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]
    const mostActiveMonthLabel = mostActiveMonth
      ? (() => { const d = new Date(mostActiveMonth[0] + "-01T12:00:00"); return `${ES_MONTHS[d.getMonth()].charAt(0).toUpperCase() + ES_MONTHS[d.getMonth()].slice(1)} ${d.getFullYear()}` })()
      : "—"

    // Favorite weekday
    const dowCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const e of myEntries) {
      const d = new Date(e.date + "T12:00:00").getDay()
      dowCounts[d]++
    }
    const favDow = Number(Object.entries(dowCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0)
    const favDowLabel = ES_DAYS[favDow].charAt(0).toUpperCase() + ES_DAYS[favDow].slice(1)

    const statCard = (emoji: string, label: string, value: string) => (
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <span style={{ fontSize: "1.25rem" }}>{emoji}</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "var(--primary)" }}>{value}</span>
      </div>
    )

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><BarChart2 size={14} /> Estadísticas</span>
        </div>
        <div className="app-content-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "1rem" }}>
            {statCard("🔥", "Racha máxima", `${maxStreak} día${maxStreak !== 1 ? "s" : ""}`)}
            {statCard("📝", "Mis entradas", `${myEntries.length}`)}
            {statCard("💑", "Entradas pareja", `${partnerEntries.length}`)}
            {statCard("📅", "Mes más activo", mostActiveMonthLabel)}
            {statCard("⭐", "Día favorito", favDowLabel)}
            {statCard("📖", "Total juntos", `${entries.length}`)}
          </div>

          <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.875rem" }}>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.9375rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.75rem" }}>Mis estados de ánimo</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {MOODS.map(m => {
                const count = moodCounts[m.id] ?? 0
                const pct = maxMoodCount > 0 ? (count / maxMoodCount) * 100 : 0
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <m.Icon size={16} style={{ color: m.accentBorder, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--foreground-light)", width: 72, flexShrink: 0 }}>{m.label}</span>
                    <div style={{ flex: 1, height: 14, background: "var(--muted)", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: m.accentBorder, borderRadius: "999px", transition: "width 0.5s ease" }} />
                    </div>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-muted)", width: 20, textAlign: "right", flexShrink: 0 }}>{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── TIMELINE view ──────────────────────────────────────────────────────────
  if (view === "timeline") {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    return (
      <>
        <style>{`
          @keyframes recordingPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        `}</style>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>📜 Timeline</span>
        </div>
        <div className="app-content-body">
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--foreground-muted)" }}>
              <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📖</p>
              <p style={{ fontSize: "0.875rem" }}>Aún no hay entradas este mes</p>
            </div>
          )}
          <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
            {/* Vertical line */}
            {sorted.length > 0 && (
              <div style={{ position: "absolute", left: "0.4375rem", top: "1rem", bottom: "1rem", width: 2, background: "linear-gradient(to bottom, var(--primary), var(--secondary))", borderRadius: 1 }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {sorted.map((entry, idx) => {
                const isMe = entry.created_by === myUid
                const mood = getMoodById(entry.mood)
                const firstPhoto = entry.photos?.[0] ?? null
                return (
                  <div key={entry.id} style={{ position: "relative" }}>
                    {/* Dot on the line */}
                    <div style={{ position: "absolute", left: -20, top: "1rem", width: 10, height: 10, borderRadius: "50%", background: isMe ? "var(--primary)" : "var(--secondary)", border: "2px solid white", boxShadow: "0 0 0 2px " + (isMe ? "var(--primary)" : "var(--secondary)"), zIndex: 1 }} />
                    <button
                      onClick={() => {
                        setSelectedDate(entry.date)
                        setSelectedEntry(entry)
                        setShowPartnerEntry(!isMe)
                        if (!isMe) {
                          const myE = getMyEntry(entry.date)
                          if (myE) { setSelectedEntry(myE); setShowPartnerEntry(true) }
                        }
                        setView("read")
                      }}
                      style={{ width: "100%", textAlign: "left", background: "white", border: `1.5px solid ${isMe ? "var(--primary-light)" : "var(--secondary-light)"}`, borderRadius: "var(--radius-md)", padding: "0.75rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "var(--shadow-sm)", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Date + author badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: isMe ? "var(--primary)" : "var(--secondary)" }}>{formatDateEs(entry.date)}</span>
                          <span style={{ fontSize: "0.5625rem", fontWeight: 700, padding: "0.125rem 0.375rem", borderRadius: "999px", background: isMe ? "var(--primary-lighter)" : "#fce7f3", color: isMe ? "var(--primary)" : "var(--secondary)" }}>
                            {isMe ? "Tú" : "Pareja"}
                          </span>
                          {entry.audio_url && <span style={{ fontSize: "0.6875rem" }}>🎙️</span>}
                        </div>
                        {/* Mood pill */}
                        {mood && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.125rem 0.5rem", borderRadius: "999px", background: mood.accent, border: `1px solid ${mood.accentBorder}`, marginBottom: "0.375rem" }}>
                            <mood.Icon size={11} style={{ color: mood.accentBorder }} />
                            <span style={{ fontSize: "0.6rem", fontWeight: 700, color: mood.accentText }}>{mood.label}</span>
                          </div>
                        )}
                        {/* Preview */}
                        <p style={{ fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                          {entry.content}
                        </p>
                      </div>
                      {/* Photo thumbnail */}
                      {firstPhoto && (
                        <img src={firstPhoto} alt="" style={{ width: 56, height: 56, borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none" }} />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── LETTER READ view ───────────────────────────────────────────────────────
  if (view === "letter-read" && selectedLetter) {
    const isFromMe = selectedLetter.from_user_id === myUid
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("letters")}>‹</button>
          <span>💌 Carta</span>
          {isFromMe && (
            <button onClick={() => deleteLetter(selectedLetter.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0.25rem" }}>
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div className="app-content-body">
          <div style={{ background: "linear-gradient(135deg, #fffbf0 0%, #fff8e8 100%)", border: "1.5px solid #f5e6c8", borderRadius: "var(--radius-lg)", padding: "1.25rem", boxShadow: "0 4px 16px rgba(245,158,11,0.12)" }}>
            {/* Header */}
            <div style={{ borderBottom: "1px solid #f5e6c8", paddingBottom: "0.75rem", marginBottom: "0.875rem" }}>
              {selectedLetter.subject && (
                <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "#92400e", marginBottom: "0.25rem" }}>{selectedLetter.subject}</p>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.75rem", color: "#a16207", fontWeight: 600 }}>
                  {isFromMe ? "✍️ De ti para tu pareja" : "💌 De tu pareja para ti"}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "#92400e" }}>
                  {new Date(selectedLetter.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "1.0625rem", lineHeight: 1.75, color: "#3d2000", whiteSpace: "pre-wrap" }}>
              {selectedLetter.content}
            </p>
            <div style={{ marginTop: "1rem", textAlign: "right" }}>
              <span style={{ fontFamily: "'Caveat', cursive", fontSize: "1rem", color: "#92400e" }}>Con cariño, {isFromMe ? "tú 💜" : "tu pareja 💕"}</span>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── LETTERS COMPOSE view ───────────────────────────────────────────────────
  if (view === "letters-compose") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("letters")}>‹</button>
          <span>✏️ Escribir carta</span>
        </div>
        <div className="app-content-body">
          <div style={{ background: "linear-gradient(135deg, #fffbf0 0%, #fff8e8 100%)", border: "1.5px solid #f5e6c8", borderRadius: "var(--radius-lg)", padding: "1rem", marginBottom: "1rem" }}>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "1rem", color: "#92400e", marginBottom: "0.625rem" }}>A mi amor...</p>
            <input
              className="input"
              placeholder="Asunto (opcional)"
              value={letterSubject}
              onChange={e => setLetterSubject(e.target.value)}
              style={{ marginBottom: "0.625rem", background: "rgba(255,255,255,0.7)", borderColor: "#f5e6c8", fontFamily: "'Quicksand', sans-serif" }}
            />
            <textarea
              className="textarea"
              rows={8}
              placeholder="Escribe tu carta aquí... sé libre de expresar lo que sientes 💜"
              value={letterContent}
              onChange={e => setLetterContent(e.target.value)}
              style={{ fontFamily: "'Caveat', cursive", fontSize: "1rem", lineHeight: 1.75, background: "rgba(255,255,255,0.7)", borderColor: "#f5e6c8", color: "#3d2000" }}
            />
          </div>
          <button className="btn btn-primary" onClick={sendLetter} disabled={sendingLetter || !letterContent.trim()}>
            {sendingLetter ? "Enviando..." : "💌 Enviar carta"}
          </button>
        </div>
      </>
    )
  }

  // ── LETTERS view ───────────────────────────────────────────────────────────
  if (view === "letters") {
    const received = letters.filter(l => l.from_user_id !== myUid)
    const sent = letters.filter(l => l.from_user_id === myUid)
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>💌 Cartas</span>
          <button
            onClick={() => setView("letters-compose")}
            style={{ fontSize: "0.6875rem", padding: "0.25rem 0.625rem", borderRadius: "999px", border: "none", background: "var(--secondary)", color: "white", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
          >
            ✏️ Escribir
          </button>
        </div>
        <div className="app-content-body">
          {letters.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <p style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💌</p>
              <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem" }}>Aún no hay cartas</p>
              <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => setView("letters-compose")}>
                ✏️ Escribir primera carta
              </button>
            </div>
          )}

          {received.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)", marginBottom: "0.5rem" }}>RECIBIDAS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {received.map(l => (
                  <button key={l.id} onClick={() => openLetter(l)}
                    style={{ width: "100%", textAlign: "left", background: l.is_read ? "white" : "linear-gradient(135deg, #fff0fb, #fffbf0)", border: `1.5px solid ${l.is_read ? "var(--border)" : "#f5e6c8"}`, borderRadius: "var(--radius-md)", padding: "0.875rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
                  >
                    <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>{l.is_read ? "📩" : "💌"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.125rem" }}>
                        {!l.is_read && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ec4899", flexShrink: 0, display: "inline-block" }} />}
                        <span style={{ fontSize: "0.8125rem", fontWeight: l.is_read ? 600 : 700, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.subject ?? "Sin asunto"}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{l.content}</p>
                      <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "0.25rem" }}>{new Date(l.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sent.length > 0 && (
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)", marginBottom: "0.5rem" }}>ENVIADAS</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sent.map(l => (
                  <button key={l.id} onClick={() => openLetter(l)}
                    style={{ width: "100%", textAlign: "left", background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.875rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}
                  >
                    <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>📤</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {l.subject ?? "Sin asunto"}
                      </span>
                      <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{l.content}</p>
                      <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "0.25rem" }}>{l.is_read ? "✅ Leída" : "⏳ Sin leer"} · {new Date(l.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  // ── READ view ──────────────────────────────────────────────────────────────
  if (view === "read" && selectedEntry && selectedDate) {
    const partnerEntry = getPartnerEntry(selectedDate)
    const partnerVisible = partnerEntry && !(privateJournal && !selectedEntry)
    const displayEntry = showPartnerEntry ? partnerEntry : selectedEntry
    const displayMood = displayEntry ? getMoodById(displayEntry.mood) : null

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>{selectedDate}</span>
        </div>
        <div className="app-content-body">
          {partnerVisible && (
            <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.75rem" }}>
              {[{ label: "Tu entrada", isPartner: false }, { label: "Pareja", isPartner: true }].map(({ label, isPartner }) => (
                <button key={label} onClick={() => setShowPartnerEntry(isPartner)}
                  style={{ flex: 1, padding: "0.375rem 0.5rem", borderRadius: "999px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, background: showPartnerEntry === isPartner ? "var(--primary)" : "var(--muted)", color: showPartnerEntry === isPartner ? "white" : "var(--foreground-light)" }}
                >{label}</button>
              ))}
            </div>
          )}

          {/* D2: Diary page aesthetic — date heading */}
          <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.0625rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.375rem" }}>
            {formatDateShortEs(selectedDate)}
          </p>

          {/* D2: Mood as large pill */}
          {displayMood && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", borderRadius: "999px", background: displayMood.accent, border: `1.5px solid ${displayMood.accentBorder}`, marginBottom: "0.75rem" }}>
              <displayMood.Icon size={18} style={{ color: displayMood.accentBorder }} />
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: displayMood.accentText }}>{displayMood.label}</span>
              {showPartnerEntry && (
                <span style={{ marginLeft: "0.25rem", fontSize: "0.5625rem", fontWeight: 700, color: "var(--foreground-muted)", background: "rgba(0,0,0,0.07)", padding: "0.0625rem 0.375rem", borderRadius: "999px" }}>PAREJA</span>
              )}
            </div>
          )}

          {/* D2: Ruled lines background on content area */}
          <div style={{
            background: "repeating-linear-gradient(transparent, transparent 27px, #e5e7eb 27px, #e5e7eb 28px)",
            borderRadius: "var(--radius-md)", padding: "0.75rem 0.75rem 0.75rem 1rem",
            border: "1px solid var(--border)", marginBottom: "0.75rem",
          }}>
            <p style={{ fontFamily: "'Caveat', cursive", fontSize: "1.0625rem", color: "var(--foreground)", lineHeight: "28px", whiteSpace: "pre-wrap" }}>
              {displayEntry?.content ?? ""}
            </p>
          </div>

          {/* Audio player */}
          {displayEntry?.audio_url && (
            <div style={{ marginBottom: "0.75rem", background: "var(--primary-lighter)", border: "1px solid var(--primary-light)", borderRadius: "var(--radius-md)", padding: "0.625rem 0.875rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)" }}>🎙️ Nota de voz</span>
              <audio controls src={displayEntry.audio_url} style={{ width: "100%", height: 36, borderRadius: "999px", accentColor: "var(--primary)" }} />
            </div>
          )}

          {displayEntry?.photos && displayEntry.photos.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginBottom: "0.75rem" }}>
              {displayEntry.photos.map((url, i) => (
                <img key={i} src={url} alt="" style={{ height: 120, width: "auto", borderRadius: "10px", flexShrink: 0, objectFit: "cover" }} />
              ))}
            </div>
          )}

          {!showPartnerEntry && (
            <button className="btn btn-outline" style={{ fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "0.375rem" }} onClick={() => startEdit(selectedEntry)}>
              <FileText size={14} /> Editar entrada
            </button>
          )}

          {/* Partner section */}
          {partnerVisible && !showPartnerEntry && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)" }}>Entrada de pareja</span>
                <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", background: "var(--muted)", padding: "0.125rem 0.5rem", borderRadius: "999px" }}>SOLO LECTURA</span>
              </div>
              {(() => {
                const pm = getMoodById(partnerEntry?.mood)
                return (
                  <>
                    {pm && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.25rem 0.625rem", borderRadius: "999px", background: pm.accent, border: `1px solid ${pm.accentBorder}`, marginBottom: "0.5rem" }}>
                        <pm.Icon size={14} style={{ color: pm.accentBorder }} />
                        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: pm.accentText }}>{pm.label}</span>
                      </div>
                    )}
                    <p style={{ fontFamily: "'Caveat', cursive", fontSize: "1rem", color: "var(--foreground)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{partnerEntry?.content}</p>
                    {partnerEntry?.audio_url && (
                      <div style={{ marginTop: "0.5rem", background: "#fce7f3", border: "1px solid #fbcfe8", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--secondary)", display: "block", marginBottom: "0.25rem" }}>🎙️ Nota de voz (pareja)</span>
                        <audio controls src={partnerEntry.audio_url} style={{ width: "100%", height: 36, accentColor: "var(--secondary)" }} />
                      </div>
                    )}
                    {partnerEntry?.photos && partnerEntry.photos.length > 0 && (
                      <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginTop: "0.75rem" }}>
                        {partnerEntry.photos.map((url, i) => (
                          <img key={i} src={url} alt="" style={{ height: 120, width: "auto", borderRadius: "10px", flexShrink: 0, objectFit: "cover" }} />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </>
    )
  }

  // ── WRITE view ─────────────────────────────────────────────────────────────
  if (view === "write") {

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => { setIsEditing(false); setView(selectedEntry ? "read" : "calendar") }}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>{isEditing ? <><FileText size={14} /> Editando</> : <><PenLine size={14} /> Nueva entrada</>}</span>
        </div>
        <div className="app-content-body">
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "0.375rem" }}>{selectedDate}</p>

          {/* Mood selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginBottom: "0.625rem" }}>
            {MOODS.map((m) => {
              const isSelected = writeMood === m.id
              return (
                <button key={m.id} onClick={() => setWriteMood(m.id)}
                  style={{ padding: "0.75rem 0.5rem", borderRadius: "var(--radius-md)", border: isSelected ? `2px solid ${m.accentBorder}` : "2px solid var(--border)", cursor: "pointer", fontFamily: "inherit", background: isSelected ? m.accent : "white", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", boxShadow: isSelected ? `0 2px 8px ${m.accentBorder}33` : "none", transform: isSelected ? "scale(1.03)" : "scale(1)", transition: "all 0.15s ease", color: isSelected ? m.accentText : "var(--foreground-light)" }}
                >
                  <m.Icon size={28} />
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700 }}>{m.label}</span>
                </button>
              )
            })}
          </div>

          {/* D3: Writing prompts */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.375rem" }}>
            <button
              onClick={() => {
                const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
                setWriteContent(prev => prev ? prev + "\n\n" + prompt : prompt)
              }}
              style={{ fontSize: "0.6875rem", padding: "0.25rem 0.625rem", borderRadius: "999px", border: "1px solid var(--border)", background: "var(--muted)", cursor: "pointer", fontFamily: "inherit", color: "var(--foreground-muted)", fontWeight: 600 }}
            >
              💡 Inspiración
            </button>
          </div>

          {/* Textarea */}
          <textarea
            className="textarea"
            rows={6}
            placeholder="¿Cómo fue vuestro día hoy?..."
            value={writeContent}
            onChange={(e) => {
              setWriteContent(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
            autoFocus
            style={{ minHeight: "120px", fontFamily: "'Caveat', cursive", fontSize: "1rem", lineHeight: 1.7, marginBottom: "0.625rem" }}
          />

          {/* Photo file upload */}
          <div style={{ marginBottom: "0.625rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.375rem" }}><Camera size={14} /> Fotos</label>
            <input
              ref={photoFileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={() => photoFileRef.current?.click()}
              disabled={uploadingPhoto}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                padding: "0.5rem 0.875rem", borderRadius: "999px",
                border: "1.5px solid var(--primary-light)", background: "var(--primary-lighter)",
                cursor: uploadingPhoto ? "wait" : "pointer",
                fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)",
              }}
            >
              <Camera size={14} />
              {uploadingPhoto ? "Subiendo..." : "📷 Añadir fotos"}
            </button>
            {photoUrls.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {photoUrls.map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "8px", border: "2px solid var(--border)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <button onClick={() => setPhotoUrls(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", fontSize: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nota de voz — grabación en la app */}
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.375rem" }}><Mic size={14} /> Nota de voz</label>

            {showMicHelp && (
              <div style={{ background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "var(--radius-md)", padding: "0.875rem", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#991b1b", marginBottom: "0.375rem", display: "flex", alignItems: "center", gap: "0.375rem" }}><MicOff size={14} /> Permiso de micrófono denegado</p>
                <p style={{ fontSize: "0.75rem", color: "#7f1d1d", marginBottom: "0.625rem" }}>Activa el micrófono en los ajustes del dispositivo y vuelve a intentarlo:</p>
                <div style={{ background: "white", borderRadius: "var(--radius-sm)", padding: "0.625rem", marginBottom: "0.375rem" }}>
                  <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#374151", marginBottom: "0.25rem" }}>📱 Android</p>
                  <p style={{ fontSize: "0.6875rem", color: "#6b7280", lineHeight: 1.5 }}>Ajustes → Aplicaciones → Chrome (o ThingsToDo) → Permisos → Micrófono → Permitir</p>
                </div>
                <div style={{ background: "white", borderRadius: "var(--radius-sm)", padding: "0.625rem" }}>
                  <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#374151", marginBottom: "0.25rem" }}>🍎 iPhone</p>
                  <p style={{ fontSize: "0.6875rem", color: "#6b7280", lineHeight: 1.5 }}>Ajustes → Safari → Micrófono → Permitir</p>
                </div>
                <button onClick={() => startRecording()} style={{ marginTop: "0.625rem", fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                  Reintentar →
                </button>
              </div>
            )}

            {audioUrl ? (
              <div style={{ background: "var(--primary-lighter)", border: "1px solid var(--primary-light)", borderRadius: "var(--radius-md)", padding: "0.5rem 0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <audio controls src={audioUrl} style={{ flex: 1, height: 34, accentColor: "var(--primary)" }} />
                <button onClick={() => setAudioUrl(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "0.25rem" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ) : isRecording ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0.875rem", background: "#fef2f2", border: "1.5px solid #fca5a5", borderRadius: "999px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", flexShrink: 0, animation: "recordingPulse 1s ease infinite" }} />
                <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.9375rem", fontWeight: 700, color: "#991b1b", flex: 1 }}>{fmtSecs(recordingSecs)}</span>
                {uploadingAudio ? (
                  <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>Subiendo...</span>
                ) : (
                  <button onClick={stopRecording} style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", padding: "0.375rem 0.75rem", borderRadius: "999px", border: "none", background: "#ef4444", cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700, color: "white", flexShrink: 0 }}>
                    <Square size={11} fill="white" /> Detener
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startRecording()}
                disabled={uploadingAudio}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.5rem 0.875rem", borderRadius: "999px",
                  border: "1.5px solid var(--primary-light)", background: "var(--primary-lighter)",
                  cursor: uploadingAudio ? "wait" : "pointer",
                  fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600, color: "var(--primary)",
                }}
              >
                <Mic size={14} />
                {uploadingAudio ? "Subiendo..." : "🎙️ Grabar nota de voz"}
              </button>
            )}
          </div>

          <button className="btn btn-primary" style={{ marginTop: "0.25rem" }} onClick={saveEntry} disabled={saving || !writeContent.trim()}>
            {saving ? "Guardando..." : isEditing ? "Actualizar entrada" : "Guardar Recuerdo"}
          </button>
        </div>
      </>
    )
  }

  // ── CALENDAR view ──────────────────────────────────────────────────────────

  const NAV_TABS = [
    { key: "calendar",  label: "📅 Mes",    action: () => { setViewingPartner(false); setView("calendar") } },
    { key: "timeline",  label: "📜 Feed",   action: () => setView("timeline") },
    { key: "stats",     label: "📊 Stats",  action: () => setView("stats") },
    { key: "letters",   label: unreadCount > 0 ? `💌 Cartas ${unreadCount}` : "💌 Cartas", action: () => { loadLetters(); setView("letters") } },
    ...(!privateJournal ? [{ key: "partner", label: "👥 Pareja", action: () => setViewingPartner(v => !v) }] : []),
  ]
  const activeTab = viewingPartner ? "partner" : (["timeline","stats","letters"].includes(view) ? view : "calendar")

  return (
    <>
      <style>{`
        @keyframes recordingPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}><Heart size={14} /> Nuestro Diario</span>
      </div>

      {/* Nav tab strip */}
      <div style={{
        display: "flex", gap: "0.375rem", overflowX: "auto", padding: "0.5rem 0.75rem",
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        scrollbarWidth: "none", flexShrink: 0,
      }}>
        {NAV_TABS.map(tab => (
          <button key={tab.key} onClick={tab.action}
            style={{
              flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, fontFamily: "inherit",
              padding: "0.375rem 0.875rem", borderRadius: "999px", border: "none", cursor: "pointer",
              background: activeTab === tab.key
                ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                : "var(--muted)",
              color: activeTab === tab.key ? "white" : "var(--foreground-muted)",
              boxShadow: activeTab === tab.key ? "0 2px 8px rgba(139,92,246,0.3)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >{tab.label}</button>
        ))}
      </div>

      <div className="app-content-body" style={{ gap: "0.5rem" }}>

        {/* Feature 4: "On this day last year" banner */}
        {!dismissedOnThisDay && onThisDayEntry && !viewingPartner && !searchQuery.trim() && (
          <div
            style={{ background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", border: "1.5px solid #f59e0b", borderRadius: "var(--radius-md)", padding: "0.625rem 0.875rem", display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", marginBottom: "0.25rem" }}
          >
            <button style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              onClick={() => { setSelectedDate(onThisDayEntry.date); setSelectedEntry(onThisDayEntry); setShowPartnerEntry(false); setView("read") }}
            >
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#92400e", display: "block", marginBottom: "0.125rem" }}>
                📅 Hace un año...
              </span>
              <span style={{ fontSize: "0.75rem", color: "#78350f", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {onThisDayEntry.content.slice(0, 80)}{onThisDayEntry.content.length > 80 ? "..." : ""}
              </span>
            </button>
            <button onClick={() => setDismissedOnThisDay(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", fontSize: "1rem", padding: "0.125rem", flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Streak banner */}
        {!viewingPartner && !searchQuery.trim() && (
          <div style={{ marginBottom: "0.25rem" }}>
            <div style={{ background: streak > 0 ? "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)" : "var(--muted)", borderRadius: "999px", padding: "0.5rem 1.125rem", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", boxShadow: streak > 0 ? "0 3px 12px rgba(139,92,246,0.25)" : "none" }}>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700, color: streak > 0 ? "white" : "var(--foreground-muted)" }}>
                {streak > 0 ? <><Flame size={16} style={{ flexShrink: 0 }} /> {streak} día{streak === 1 ? "" : "s"} de racha juntos</> : <><Mail size={16} style={{ flexShrink: 0 }} /> Escribe hoy para empezar la racha</>}
              </span>
            </div>
            <div style={{ textAlign: "center", marginTop: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: todayStatus === "both" ? "#065f46" : todayStatus === "onlyme" ? "#92400e" : "var(--foreground-muted)", background: todayStatus === "both" ? "#d1fae5" : todayStatus === "onlyme" ? "#fef3c7" : "transparent", padding: todayStatus !== "none" ? "0.125rem 0.625rem" : undefined, borderRadius: "999px" }}>
                {todayStatus === "both" && <><CheckCircle2 size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Los dos escribieron hoy</>}
                {todayStatus === "onlyme" && <><FileText size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Solo tú escribiste hoy</>}
                {todayStatus === "none" && <><Mail size={12} style={{ display: "inline", verticalAlign: "middle" }} /> Ninguno ha escrito hoy</>}
              </span>
            </div>
          </div>
        )}

        {/* Partner view */}
        {viewingPartner ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}><Heart size={12} /> Entradas de tu pareja</p>
            {entries.filter(e => e.created_by !== user?.uid).sort((a, b) => b.date.localeCompare(a.date)).map(e => (
              <button key={e.id} onClick={() => { setSelectedDate(e.date); setViewingPartner(false) }}
                style={{ textAlign: "left", background: "linear-gradient(135deg, var(--primary-lighter), white)", border: "1px solid var(--primary-light)", borderRadius: "var(--radius-md)", padding: "0.75rem", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>{e.date} <Heart size={10} /></div>
                <div style={{ fontSize: "0.8125rem", color: "var(--foreground)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{e.content}</div>
              </button>
            ))}
            {entries.filter(e => e.created_by !== user?.uid).length === 0 && (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ color: "var(--primary)", display: "flex", justifyContent: "center" }}><Heart size={32} /></div>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginTop: "0.375rem" }}>Tu pareja aún no ha escrito</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: "0.75rem" }}>
              <span style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--foreground-muted)" }}><SearchIcon size={14} /></span>
              <input className="input" type="search" placeholder="Buscar en el diario..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "2rem" }} />
            </div>

            {/* Search results vs calendar */}
            {searchQuery.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase())).map(e => (
                  <button key={e.id} onClick={() => { setSelectedDate(e.date); setSearchQuery("") }}
                    style={{ textAlign: "left", background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.75rem", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>{e.date}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--foreground)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{e.content}</div>
                  </button>
                ))}
                {entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.8125rem" }}>Sin resultados</p>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button className="back-btn-phone" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", textTransform: "capitalize" }}>{monthLabel}</span>
                  <button className="back-btn-phone" style={{ transform: "rotate(180deg)" }} onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>‹</button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
                  {weekDays.map((d) => (
                    <div key={d} style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", padding: "0.25rem 0" }}>{d}</div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    const myEntry = getMyEntry(dateStr)
                    const partnerEntry = getPartnerEntry(dateStr)
                    const hasAny = !!(myEntry || partnerEntry)
                    const now = new Date()
                    const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
                    const isToday = dateStr === todayLocal
                    return (
                      <button
                        key={day}
                        onClick={() => openDay(dateStr)}
                        style={{ aspectRatio: "1", borderRadius: "10px", border: isToday ? "2px solid var(--primary)" : hasAny ? "1.5px solid var(--primary-light)" : "1px solid var(--border)", background: isToday ? "var(--primary-lighter)" : myEntry ? "linear-gradient(135deg, var(--primary-lighter) 0%, var(--muted) 100%)" : partnerEntry ? "linear-gradient(135deg, #fce7f3 0%, #fff 100%)" : "white", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: "0.6875rem", fontWeight: isToday ? 800 : hasAny ? 700 : 400, color: isToday ? "var(--primary)" : hasAny ? "var(--foreground)" : "var(--foreground-muted)", gap: "2px", padding: "3px 2px", boxShadow: isToday ? "0 2px 8px rgba(139,92,246,0.2)" : "none", transition: "transform 0.1s" }}
                      >
                        <span style={{ lineHeight: 1 }}>{day}</span>
                        {/* D1: Two dots — left purple (mine), right pink (partner) */}
                        {(myEntry || partnerEntry) && (
                          <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                            {myEntry && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", flexShrink: 0 }} />}
                            {partnerEntry && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--secondary)", flexShrink: 0 }} />}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
