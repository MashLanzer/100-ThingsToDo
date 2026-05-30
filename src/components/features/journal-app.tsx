"use client"

import { useState, useEffect, useRef } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"
import type { JournalEntry } from "@/types"

const MOODS = [
  { id: "happy",    emoji: "😊", label: "Feliz",       accent: "#FEF3C7", accentBorder: "#F59E0B", accentText: "#92400E" },
  { id: "love",     emoji: "🥰", label: "Enamorado/a", accent: "#FCE7F3", accentBorder: "#EC4899", accentText: "#9D174D" },
  { id: "fun",      emoji: "😄", label: "Divertido",   accent: "#FED7AA", accentBorder: "#F97316", accentText: "#7C2D12" },
  { id: "romantic", emoji: "💕", label: "Romántico",   accent: "#FFE4E6", accentBorder: "#F43F5E", accentText: "#881337" },
  { id: "chill",    emoji: "😌", label: "Tranquilo",   accent: "#E0F2FE", accentBorder: "#0284C7", accentText: "#075985" },
  { id: "sad",      emoji: "😢", label: "Triste",      accent: "#DBEAFE", accentBorder: "#3B82F6", accentText: "#1E40AF" },
]

function readJournalSettings() {
  try {
    const raw = localStorage.getItem("ttd_settings_v1")
    if (!raw) return { weekStartsMonday: false, privateJournal: false }
    const s = JSON.parse(raw)
    return { weekStartsMonday: !!s.weekStartsMonday, privateJournal: !!s.privateJournal }
  } catch { return { weekStartsMonday: false, privateJournal: false } }
}

// ── Streak calculation helpers ────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function subtractDay(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() - days)
  return toLocalDateStr(d)
}

function calculateStreak(entries: JournalEntry[], myUid: string): number {
  if (!myUid) return 0

  // Build sets of dates per user
  const myDates = new Set<string>()
  const partnerDates = new Set<string>()
  for (const e of entries) {
    if (e.created_by === myUid) myDates.add(e.date)
    else partnerDates.add(e.date)
  }

  // Dates where BOTH wrote
  const bothDates = new Set<string>()
  for (const d of myDates) {
    if (partnerDates.has(d)) bothDates.add(d)
  }

  if (bothDates.size === 0) return 0

  const todayStr = toLocalDateStr(new Date())
  const yesterdayStr = subtractDay(todayStr, 1)

  // Start from today if both wrote today, otherwise start from yesterday
  const startDate = bothDates.has(todayStr) ? todayStr : yesterdayStr
  if (!bothDates.has(startDate)) return 0

  let streak = 0
  let current = startDate
  while (bothDates.has(current)) {
    streak++
    current = subtractDay(current, 1)
  }
  return streak
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

interface Props { onBack: () => void }
type View = "calendar" | "read" | "write"

export function JournalApp({ onBack }: Props) {
  const { user } = useAuth()
  const myUid = user?.uid ?? ""
  const [view, setView] = useState<View>("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [writeContent, setWriteContent] = useState("")
  const [writeMood, setWriteMood] = useState("happy")
  const [saving, setSaving] = useState(false)
  const [showPartnerEntry, setShowPartnerEntry] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [weekStartsMonday, setWeekStartsMonday] = useState(false)
  const [privateJournal, setPrivateJournal] = useState(false)
  // Feature 10: search
  const [searchQuery, setSearchQuery] = useState("")
  // Feature 11: photos
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoInput, setPhotoInput] = useState("")
  // Feature 12: view partner entries
  const [viewingPartner, setViewingPartner] = useState(false)

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

    // Check PIN on mount
    const stored = getStoredPin()
    if (stored) {
      setPinRequired(true)
    }
  }, [])

  useEffect(() => { loadEntries() }, [month, year])

  async function loadEntries() {
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch(`/api/journal?year=${year}&month=${month + 1}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setEntries(await res.json())
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
      setPhotoInput("")
      setView("write")
    }
  }

  function startEdit(entry: JournalEntry) {
    setWriteContent(entry.content)
    setWriteMood(entry.mood ?? "happy")
    setPhotoUrls(entry.photos ?? [])
    setPhotoInput("")
    setIsEditing(true)
    setView("write")
  }

  async function saveEntry() {
    if (!selectedDate || !writeContent.trim()) return
    setSaving(true)
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token) throw new Error("Not authenticated")
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: selectedDate, content: writeContent.trim(), mood: writeMood, photos: photoUrls }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success(isEditing ? "Entrada actualizada ✏️" : "Entrada guardada 💕")
      await loadEntries()
      setView("calendar")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
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
        setTimeout(() => {
          setPinUnlocked(true)
          setPinRequired(false)
          setPinInput("")
          setPinSuccess(false)
        }, 600)
      } else {
        setPinShake(true)
        setTimeout(() => {
          setPinShake(false)
          setPinInput("")
        }, 700)
      }
    }
  }

  function handlePinBackspace() {
    setPinInput(prev => prev.slice(0, -1))
  }

  // ── PIN lock screen ────────────────────────────────────────────────────────
  if (pinRequired && !pinUnlocked) {
    return (
      <>
        <style>{`
          @keyframes pinShake {
            0%,100%{transform:translateX(0)}
            15%{transform:translateX(-8px)}
            30%{transform:translateX(8px)}
            45%{transform:translateX(-6px)}
            60%{transform:translateX(6px)}
            75%{transform:translateX(-4px)}
            90%{transform:translateX(4px)}
          }
          @keyframes pinPop {
            0%{transform:scale(0.8);opacity:0}
            60%{transform:scale(1.15)}
            100%{transform:scale(1);opacity:1}
          }
        `}</style>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={onBack}>‹</button>
          <span>Diario Privado 🔐</span>
        </div>
        <div className="app-content-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", paddingTop: "2rem" }}>
          {/* Lock icon */}
          <div style={{ fontSize: "3.5rem", animation: pinSuccess ? "pinPop 0.5s ease" : undefined }}>
            {pinSuccess ? "✨" : "🔐"}
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
              Diario privado
            </p>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>Ingresa tu PIN para continuar</p>
          </div>

          {/* Dot indicators */}
          <div
            style={{
              display: "flex", gap: "0.875rem",
              animation: pinShake ? "pinShake 0.7s ease" : undefined,
            }}
          >
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: 16, height: 16, borderRadius: "50%",
                  border: "2px solid",
                  borderColor: pinShake ? "#ef4444" : pinSuccess ? "#10b981" : "var(--primary)",
                  background: pinInput.length > i
                    ? (pinShake ? "#ef4444" : pinSuccess ? "#10b981" : "var(--primary)")
                    : "transparent",
                  transition: "background 0.15s, border-color 0.15s",
                }}
              />
            ))}
          </div>

          {/* Hidden input for mobile keyboard fallback (not shown) */}
          <input
            ref={pinHiddenRef}
            type="tel"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 4)
              setPinInput(val)
              if (val.length === 4) {
                const stored = getStoredPin()
                if (val === stored) {
                  setPinSuccess(true)
                  setTimeout(() => { setPinUnlocked(true); setPinRequired(false); setPinInput(""); setPinSuccess(false) }, 600)
                } else {
                  setPinShake(true)
                  setTimeout(() => { setPinShake(false); setPinInput("") }, 700)
                }
              }
            }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 1, height: 1 }}
          />

          {/* Numeric keypad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem", width: "100%", maxWidth: 240 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button
                key={n}
                onClick={() => handlePinKeyPress(String(n))}
                style={{
                  aspectRatio: "1", borderRadius: "50%",
                  border: "2px solid var(--border)",
                  background: "white",
                  cursor: "pointer", fontFamily: "'Fredoka', sans-serif",
                  fontSize: "1.375rem", fontWeight: 600,
                  color: "var(--foreground)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  transition: "background 0.1s, transform 0.1s",
                }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                {n}
              </button>
            ))}
            {/* Row: [empty] [0] [backspace] */}
            <div />
            <button
              onClick={() => handlePinKeyPress("0")}
              style={{
                aspectRatio: "1", borderRadius: "50%",
                border: "2px solid var(--border)",
                background: "white",
                cursor: "pointer", fontFamily: "'Fredoka', sans-serif",
                fontSize: "1.375rem", fontWeight: 600,
                color: "var(--foreground)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                transition: "background 0.1s, transform 0.1s",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              0
            </button>
            <button
              onClick={handlePinBackspace}
              style={{
                aspectRatio: "1", borderRadius: "50%",
                border: "2px solid var(--border)",
                background: "white",
                cursor: "pointer",
                fontSize: "1.125rem",
                color: "var(--foreground-light)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                transition: "background 0.1s, transform 0.1s",
              }}
              onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
              onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
            >
              ⌫
            </button>
          </div>

          {/* Cancel */}
          <button
            onClick={onBack}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.8125rem", color: "var(--foreground-muted)",
              fontFamily: "inherit", textDecoration: "underline", marginTop: "0.25rem",
            }}
          >
            Cancelar
          </button>
        </div>
      </>
    )
  }

  // Calendar calculations with weekStartsMonday support
  const rawFirstDay = new Date(year, month, 1).getDay() // 0=Sun
  const firstDay = weekStartsMonday ? (rawFirstDay + 6) % 7 : rawFirstDay
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = `${currentDate.toLocaleString("es-ES", { month: "long" })} ${year}`
  const weekDays = weekStartsMonday
    ? ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]
    : ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"]

  // ── Streak calculation ─────────────────────────────────────────────────────
  const streak = calculateStreak(entries, myUid)
  const todayStatus = getTodayStatus(entries, myUid)

  // ── Read view ──────────────────────────────────────────────────────────────
  if (view === "read" && selectedEntry && selectedDate) {
    const partnerEntry = getPartnerEntry(selectedDate)
    // If private journal mode and I haven't written yet: don't show partner entry
    const partnerVisible = partnerEntry && !(privateJournal && !selectedEntry)
    const displayEntry = showPartnerEntry ? partnerEntry : selectedEntry
    const displayMood = displayEntry ? MOODS.find((m) => m.id === displayEntry.mood) : null

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>{selectedDate}</span>
        </div>
        <div className="app-content-body">
          {partnerVisible && (
            <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Tu entrada", isPartner: false },
                { label: "Pareja", isPartner: true },
              ].map(({ label, isPartner }) => (
                <button
                  key={label}
                  onClick={() => setShowPartnerEntry(isPartner)}
                  style={{
                    flex: 1, padding: "0.375rem 0.5rem", borderRadius: "999px", border: "none",
                    cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                    background: showPartnerEntry === isPartner ? "var(--primary)" : "var(--muted)",
                    color: showPartnerEntry === isPartner ? "white" : "var(--foreground-light)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {displayMood && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{displayMood.emoji}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)" }}>{displayMood.label}</span>
              {showPartnerEntry && (
                <span style={{ marginLeft: "auto", fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", background: "var(--muted)", padding: "0.125rem 0.5rem", borderRadius: "999px" }}>
                  SOLO LECTURA
                </span>
              )}
            </div>
          )}

          <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {displayEntry?.content ?? ""}
          </p>

          {/* Feature 11: show photos in read view */}
          {displayEntry?.photos && displayEntry.photos.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", marginTop: "0.75rem" }}>
              {displayEntry.photos.map((url, i) => (
                <img key={i} src={url} alt="" style={{ height: 120, width: "auto", borderRadius: "10px", flexShrink: 0, objectFit: "cover" }} />
              ))}
            </div>
          )}

          {!showPartnerEntry && (
            <button className="btn btn-outline" style={{ marginTop: "1rem", fontSize: "0.8125rem" }} onClick={() => startEdit(selectedEntry)}>
              ✏️ Editar entrada
            </button>
          )}

          {/* Partner entry below (if not toggled) */}
          {partnerVisible && !showPartnerEntry && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)" }}>Entrada de pareja</span>
                <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", background: "var(--muted)", padding: "0.125rem 0.5rem", borderRadius: "999px" }}>
                  SOLO LECTURA
                </span>
              </div>
              {(() => {
                const pm = MOODS.find((m) => m.id === partnerEntry?.mood)
                return (
                  <>
                    {pm && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                        <span style={{ fontSize: "1.25rem" }}>{pm.emoji}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--foreground-light)" }}>{pm.label}</span>
                      </div>
                    )}
                    <p style={{ fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                      {partnerEntry?.content}
                    </p>
                    {/* Feature 11: partner photos in read view */}
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

  // ── Write view ─────────────────────────────────────────────────────────────
  if (view === "write") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => { setIsEditing(false); setView(selectedEntry ? "read" : "calendar") }}>‹</button>
          <span>{isEditing ? "✏️ Editando" : "✍️ Nueva entrada"}</span>
        </div>
        <div className="app-content-body">
          <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "0.375rem" }}>{selectedDate}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginBottom: "0.625rem" }}>
            {MOODS.map((m) => {
              const isSelected = writeMood === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setWriteMood(m.id)}
                  style={{
                    padding: "0.75rem 0.5rem", borderRadius: "var(--radius-md)",
                    border: isSelected ? `2px solid ${m.accentBorder}` : "2px solid var(--border)",
                    cursor: "pointer", fontFamily: "inherit",
                    background: isSelected ? m.accent : "white",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                    boxShadow: isSelected ? `0 2px 8px ${m.accentBorder}33` : "none",
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{m.emoji}</span>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: isSelected ? m.accentText : "var(--foreground-light)" }}>{m.label}</span>
                </button>
              )
            })}
          </div>

          {/* Feature 11: photo URL input */}
          <div style={{ marginTop: "0.625rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", display: "block", marginBottom: "0.375rem" }}>📸 Fotos (URL)</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input className="input" placeholder="https://..." value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-outline" style={{ flexShrink: 0, padding: "0 0.75rem" }} onClick={() => {
                if (photoInput.trim()) { setPhotoUrls(prev => [...prev, photoInput.trim()]); setPhotoInput("") }
              }}>+</button>
            </div>
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
            style={{ minHeight: "120px", marginTop: "0.625rem" }}
          />
          <button className="btn btn-primary" style={{ marginTop: "0.5rem" }} onClick={saveEntry} disabled={saving || !writeContent.trim()}>
            {saving ? "Guardando..." : isEditing ? "💾 Actualizar entrada" : "Guardar Recuerdo 💕"}
          </button>
        </div>
      </>
    )
  }

  // ── Calendar view ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>Nuestro Diario 💕</span>
        {/* Feature 12: partner view toggle - only show if not privateJournal */}
        {!privateJournal && (
          <button
            onClick={() => setViewingPartner(v => !v)}
            style={{
              fontSize: "0.6875rem", padding: "0.25rem 0.625rem", borderRadius: "999px", border: "none",
              background: viewingPartner ? "var(--secondary)" : "var(--muted)",
              color: viewingPartner ? "white" : "var(--foreground-muted)",
              cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
            }}
          >
            {viewingPartner ? "💕 Pareja" : "👤 Pareja"}
          </button>
        )}
      </div>
      <div className="app-content-body" style={{ gap: "0.5rem" }}>

        {/* ── Streak banner ─────────────────────────────────────────────────── */}
        {!viewingPartner && !searchQuery.trim() && (
          <div style={{ marginBottom: "0.25rem" }}>
            {/* Main streak pill */}
            <div style={{
              background: streak > 0
                ? "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)"
                : "var(--muted)",
              borderRadius: "999px",
              padding: "0.5rem 1.125rem",
              textAlign: "center",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
              boxShadow: streak > 0 ? "0 3px 12px rgba(139,92,246,0.25)" : "none",
            }}>
              <span style={{
                fontFamily: "'Fredoka', sans-serif",
                fontSize: "1rem", fontWeight: 700,
                color: streak > 0 ? "white" : "var(--foreground-muted)",
              }}>
                {streak > 0 ? `🔥 ${streak} día${streak === 1 ? "" : "s"} de racha juntos` : "💌 Escribe hoy para empezar la racha"}
              </span>
            </div>

            {/* Today status */}
            <div style={{ textAlign: "center", marginTop: "0.375rem" }}>
              <span style={{
                fontSize: "0.75rem", fontWeight: 600,
                color: todayStatus === "both" ? "#065f46" : todayStatus === "onlyme" ? "#92400e" : "var(--foreground-muted)",
                background: todayStatus === "both" ? "#d1fae5" : todayStatus === "onlyme" ? "#fef3c7" : "transparent",
                padding: todayStatus !== "none" ? "0.125rem 0.625rem" : undefined,
                borderRadius: "999px",
              }}>
                {todayStatus === "both" && "✅ Los dos escribieron hoy"}
                {todayStatus === "onlyme" && "📝 Solo tú escribiste hoy"}
                {todayStatus === "none" && "💌 Ninguno ha escrito hoy"}
              </span>
            </div>
          </div>
        )}

        {/* Feature 12: partner view */}
        {viewingPartner ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", textAlign: "center" }}>Entradas de tu pareja 💕</p>
            {entries
              .filter(e => e.created_by !== user?.uid)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(e => (
                <button key={e.id} onClick={() => { setSelectedDate(e.date); setViewingPartner(false) }}
                  style={{ textAlign: "left", background: "linear-gradient(135deg, var(--primary-lighter), white)", border: "1px solid var(--primary-light)", borderRadius: "var(--radius-md)", padding: "0.75rem", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>{e.date} 💕</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--foreground)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {e.content}
                  </div>
                </button>
              ))
            }
            {entries.filter(e => e.created_by !== user?.uid).length === 0 && (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ fontSize: "2rem" }}>💕</div>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginTop: "0.375rem" }}>Tu pareja aún no ha escrito</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Feature 10: search bar */}
            <div style={{ position: "relative", marginBottom: "0.75rem" }}>
              <span style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.875rem", pointerEvents: "none" }}>🔍</span>
              <input className="input" type="search" placeholder="Buscar en el diario..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: "2rem" }} />
            </div>

            {/* Feature 10: search results vs calendar */}
            {searchQuery.trim() ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {entries
                  .filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(e => (
                    <button key={e.id} onClick={() => { setSelectedDate(e.date); setSearchQuery("") }}
                      style={{ textAlign: "left", background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "0.75rem", cursor: "pointer", fontFamily: "inherit", width: "100%" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>{e.date}</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--foreground)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {e.content}
                      </div>
                    </button>
                  ))
                }
                {entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.8125rem" }}>Sin resultados</p>
                )}
              </div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button className="back-btn-phone" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", textTransform: "capitalize" }}>
                    {monthLabel}
                  </span>
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
                    const moodId = myEntry?.mood ?? ""
                    const moodDotColor = myEntry
                      ? (["happy","love"].includes(moodId) ? "var(--primary)" : ["sad"].includes(moodId) ? "#f87171" : "#94a3b8")
                      : null
                    return (
                      <button
                        key={day}
                        onClick={() => openDay(dateStr)}
                        style={{
                          aspectRatio: "1", borderRadius: "10px",
                          border: isToday ? "2px solid var(--primary)" : hasAny ? "1.5px solid var(--primary-light)" : "1px solid var(--border)",
                          background: isToday
                            ? "var(--primary-lighter)"
                            : myEntry
                            ? "linear-gradient(135deg, var(--primary-lighter) 0%, var(--muted) 100%)"
                            : partnerEntry
                            ? "linear-gradient(135deg, #fce7f3 0%, #fff 100%)"
                            : "white",
                          cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          fontSize: "0.6875rem",
                          fontWeight: isToday ? 800 : hasAny ? 700 : 400,
                          color: isToday ? "var(--primary)" : hasAny ? "var(--foreground)" : "var(--foreground-muted)",
                          gap: "2px", padding: "3px 2px",
                          boxShadow: isToday ? "0 2px 8px rgba(139,92,246,0.2)" : "none",
                          transition: "transform 0.1s",
                        }}
                      >
                        <span style={{ lineHeight: 1 }}>{day}</span>
                        {moodDotColor && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: moodDotColor, flexShrink: 0 }} />}
                        {!moodDotColor && partnerEntry && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--secondary)", flexShrink: 0 }} />}
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
