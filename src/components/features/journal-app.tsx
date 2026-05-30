"use client"

import { useState, useEffect } from "react"
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

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    loadEntries()
  }, [month, year])

  async function loadEntries() {
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch(`/api/journal?year=${year}&month=${month + 1}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setEntries(data)
    } catch { /* silently fail */ }
  }

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  function getEntriesForDate(dateStr: string): JournalEntry[] {
    return entries.filter((e) => e.date === dateStr)
  }

  function getMyEntry(dateStr: string): JournalEntry | undefined {
    return entries.find((e) => e.date === dateStr && e.created_by === myUid)
  }

  function getPartnerEntry(dateStr: string): JournalEntry | undefined {
    return entries.find((e) => e.date === dateStr && e.created_by !== myUid)
  }

  function openDay(dateStr: string) {
    setSelectedDate(dateStr)
    setShowPartnerEntry(false)
    const myEntry = getMyEntry(dateStr)
    if (myEntry) {
      setSelectedEntry(myEntry)
      setView("read")
    } else {
      setSelectedEntry(null)
      setWriteContent("")
      setWriteMood("happy")
      setView("write")
    }
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
        body: JSON.stringify({ date: selectedDate, content: writeContent.trim(), mood: writeMood }),
      })
      if (!res.ok) throw new Error("Error al guardar")
      toast.success("Entrada guardada 💕")
      await loadEntries()
      setView("calendar")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally {
      setSaving(false)
    }
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentDate.toLocaleString("es-ES", { month: "long", year: "numeric" })

  if (view === "read" && selectedEntry && selectedDate) {
    const partnerEntry = getPartnerEntry(selectedDate)
    const displayEntry = showPartnerEntry ? partnerEntry : selectedEntry
    const displayMood = displayEntry ? MOODS.find((m) => m.id === displayEntry.mood) : null

    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>{selectedDate}</span>
        </div>
        <div className="app-content-body">
          {/* Toggle between my entry and partner's entry */}
          {partnerEntry && (
            <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.75rem" }}>
              <button
                onClick={() => setShowPartnerEntry(false)}
                style={{
                  flex: 1, padding: "0.375rem 0.5rem", borderRadius: "999px", border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                  background: !showPartnerEntry ? "var(--primary)" : "var(--muted)",
                  color: !showPartnerEntry ? "white" : "var(--foreground-light)",
                }}
              >
                Tu entrada
              </button>
              <button
                onClick={() => setShowPartnerEntry(true)}
                style={{
                  flex: 1, padding: "0.375rem 0.5rem", borderRadius: "999px", border: "none",
                  cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                  background: showPartnerEntry ? "var(--primary)" : "var(--muted)",
                  color: showPartnerEntry ? "white" : "var(--foreground-light)",
                }}
              >
                Entrada de pareja
              </button>
            </div>
          )}

          {displayMood && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{displayMood.emoji}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)" }}>{displayMood.label}</span>
              {showPartnerEntry && (
                <span style={{
                  marginLeft: "auto", fontSize: "0.625rem", fontWeight: 700,
                  color: "var(--foreground-muted)", background: "var(--muted)",
                  padding: "0.125rem 0.5rem", borderRadius: "999px",
                }}>
                  SOLO LECTURA
                </span>
              )}
            </div>
          )}

          <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {displayEntry?.content ?? ""}
          </p>

          {!showPartnerEntry && (
            <button
              className="btn btn-outline"
              style={{ marginTop: "1rem", fontSize: "0.8125rem" }}
              onClick={() => {
                setWriteContent(selectedEntry.content)
                setWriteMood(selectedEntry.mood ?? "happy")
                setView("write")
              }}
            >
              ✏️ Editar
            </button>
          )}

          {/* Show partner entry below if both exist and not in toggle mode */}
          {partnerEntry && !showPartnerEntry && (
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--foreground-muted)" }}>
                  Entrada de pareja
                </span>
                <span style={{
                  fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)",
                  background: "var(--muted)", padding: "0.125rem 0.5rem", borderRadius: "999px",
                }}>
                  SOLO LECTURA
                </span>
              </div>
              {(() => {
                const partnerMood = MOODS.find((m) => m.id === partnerEntry.mood)
                return (
                  <>
                    {partnerMood && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.375rem" }}>
                        <span style={{ fontSize: "1.25rem" }}>{partnerMood.emoji}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--foreground-light)" }}>{partnerMood.label}</span>
                      </div>
                    )}
                    <p style={{ fontSize: "0.8125rem", color: "var(--foreground)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                      {partnerEntry.content}
                    </p>
                  </>
                )
              })()}
            </div>
          )}

        </div>
      </>
    )
  }

  if (view === "write") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>✍️ {selectedDate}</span>
        </div>
        <div className="app-content-body">
          {/* Mood selector: 2×3 grid with color accents */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginBottom: "0.625rem" }}>
            {MOODS.map((m) => {
              const isSelected = writeMood === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setWriteMood(m.id)}
                  style={{
                    padding: "0.75rem 0.5rem",
                    borderRadius: "var(--radius-md)",
                    border: isSelected ? `2px solid ${m.accentBorder}` : "2px solid var(--border)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: isSelected ? m.accent : "white",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                    boxShadow: isSelected ? `0 2px 8px ${m.accentBorder}33` : "none",
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>{m.emoji}</span>
                  <span style={{
                    fontSize: "0.6875rem", fontWeight: 700,
                    color: isSelected ? m.accentText : "var(--foreground-light)",
                  }}>{m.label}</span>
                </button>
              )
            })}
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
            style={{ minHeight: "120px" }}
          />
          <button
            className="btn btn-primary"
            style={{ marginTop: "0.5rem" }}
            onClick={saveEntry}
            disabled={saving || !writeContent.trim()}
          >
            {saving ? "Guardando..." : "Guardar Recuerdo 💕"}
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>Nuestro Diario 💕</span>
      </div>
      <div className="app-content-body" style={{ gap: "0.5rem" }}>
        {/* Month navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="back-btn-phone" onClick={prevMonth}>‹</button>
          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", textTransform: "capitalize" }}>
            {monthName}
          </span>
          <button className="back-btn-phone" style={{ transform: "rotate(180deg)" }} onClick={nextMonth}>‹</button>
        </div>

        {/* Weekday headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center" }}>
          {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"].map((d) => (
            <div key={d} style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", padding: "0.25rem 0" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const dayEntries = getEntriesForDate(dateStr)
            const myEntry = dayEntries.find((e) => e.created_by === myUid)
            const partnerEntry = dayEntries.find((e) => e.created_by !== myUid)
            const myMood = myEntry ? MOODS.find((m) => m.id === myEntry.mood) : null
            const partnerMood = partnerEntry ? MOODS.find((m) => m.id === partnerEntry.mood) : null
            const hasAny = dayEntries.length > 0
            const now = new Date()
            const todayLocal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
            const isToday = dateStr === todayLocal

            // Mood dot color
            const moodDotColor = myMood
              ? (["happy","love"].includes(myEntry?.mood ?? "") ? "var(--primary)" : ["sad","angry"].includes(myEntry?.mood ?? "") ? "#f87171" : "#94a3b8")
              : null

            return (
              <button
                key={day}
                onClick={() => openDay(dateStr)}
                style={{
                  aspectRatio: "1",
                  borderRadius: "10px",
                  border: isToday ? "2px solid var(--primary)" : hasAny ? "1.5px solid var(--primary-light)" : "1px solid var(--border)",
                  background: isToday
                    ? "var(--primary-lighter)"
                    : myEntry
                    ? "linear-gradient(135deg, var(--primary-lighter) 0%, var(--muted) 100%)"
                    : partnerEntry
                    ? "linear-gradient(135deg, #fce7f3 0%, #fff 100%)"
                    : "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6875rem",
                  fontWeight: isToday ? 800 : hasAny ? 700 : 400,
                  color: isToday ? "var(--primary)" : hasAny ? "var(--foreground)" : "var(--foreground-muted)",
                  gap: "2px",
                  padding: "3px 2px",
                  boxShadow: isToday ? "0 2px 8px rgba(139,92,246,0.2)" : "none",
                  transition: "transform 0.1s",
                }}
              >
                <span style={{ lineHeight: 1 }}>{day}</span>
                {/* Mood dot */}
                {moodDotColor && (
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: moodDotColor, flexShrink: 0 }} />
                )}
                {/* Partner dot (secondary color) */}
                {!moodDotColor && partnerEntry && (
                  <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--secondary)", flexShrink: 0 }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
