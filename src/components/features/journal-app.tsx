"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { JournalEntry } from "@/types"

const MOODS = [
  { id: "happy",    emoji: "😊", label: "Feliz" },
  { id: "love",     emoji: "🥰", label: "Enamorado/a" },
  { id: "fun",      emoji: "😄", label: "Divertido" },
  { id: "romantic", emoji: "💕", label: "Romántico" },
  { id: "chill",    emoji: "😌", label: "Tranquilo" },
  { id: "sad",      emoji: "😢", label: "Triste" },
]

interface Props { onBack: () => void }

type View = "calendar" | "read" | "write"

export function JournalApp({ onBack }: Props) {
  const [view, setView] = useState<View>("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
  const [writeContent, setWriteContent] = useState("")
  const [writeMood, setWriteMood] = useState("happy")
  const [saving, setSaving] = useState(false)

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

  function getEntryForDate(dateStr: string) {
    return entries.find((e) => e.date === dateStr)
  }

  function openDay(dateStr: string) {
    const entry = getEntryForDate(dateStr)
    setSelectedDate(dateStr)
    if (entry) {
      setSelectedEntry(entry)
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

  if (view === "read" && selectedEntry) {
    const mood = MOODS.find((m) => m.id === selectedEntry.mood)
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("calendar")}>‹</button>
          <span>{selectedDate}</span>
        </div>
        <div className="app-content-body">
          {mood && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{mood.emoji}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)" }}>{mood.label}</span>
            </div>
          )}
          <p style={{ fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {selectedEntry.content}
          </p>
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
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            {MOODS.map((m) => (
              <button
                key={m.id}
                onClick={() => setWriteMood(m.id)}
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "inherit",
                  background: writeMood === m.id ? "var(--primary)" : "var(--muted)",
                  color: writeMood === m.id ? "white" : "var(--foreground-light)",
                }}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <textarea
            className="textarea"
            rows={8}
            placeholder="¿Cómo fue vuestro día hoy?..."
            value={writeContent}
            onChange={(e) => setWriteContent(e.target.value)}
            autoFocus
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
            const entry = getEntryForDate(dateStr)
            const mood = entry ? MOODS.find((m) => m.id === entry.mood) : null
            const isToday = dateStr === new Date().toISOString().split("T")[0]

            return (
              <button
                key={day}
                onClick={() => openDay(dateStr)}
                style={{
                  aspectRatio: "1",
                  borderRadius: "8px",
                  border: isToday ? "2px solid var(--primary)" : "1px solid transparent",
                  background: entry ? "var(--primary-lighter)" : "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "var(--primary)" : "var(--foreground-light)",
                  gap: "1px",
                }}
              >
                {mood ? <span style={{ fontSize: "0.75rem" }}>{mood.emoji}</span> : null}
                <span>{day}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
