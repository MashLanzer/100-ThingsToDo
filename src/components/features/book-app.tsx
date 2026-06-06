"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, Trash2 } from "lucide-react"
import { getFirebaseToken, getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"

interface BookEntry {
  id: string
  couple_id: string
  author_id: string
  author_name: string
  content: string
  created_at: string
}

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await getFirebaseToken()
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
}

function formatTs(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
}

const BOOK_CSS = `
@keyframes bookEntryIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes turnPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(146,64,14,0.3); }
  50%     { box-shadow: 0 0 0 6px rgba(146,64,14,0); }
}
`

export function BookApp({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<BookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [myUid, setMyUid] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const auth = getFirebaseAuth()
    auth.authStateReady().then(() => setMyUid(auth.currentUser?.uid ?? null))
  }, [])

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/book")
      if (res.ok) setEntries(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)
    }
  }, [entries, loading])

  const lastEntry = entries[entries.length - 1]
  const isMyTurn = !lastEntry || lastEntry.author_id !== myUid

  async function handleSubmit() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await authFetch("/api/book", { method: "POST", body: JSON.stringify({ content: text }) })
      if (res.status === 409) { toast.error("Espera a que tu pareja escriba su parte"); return }
      if (!res.ok) throw new Error()
      setText("")
      await loadEntries()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(entry: BookEntry) {
    setDeletingId(entry.id)
    try {
      const res = await authFetch(`/api/book/${entry.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Solo puedes borrar tu último párrafo"); return }
      await loadEntries()
    } catch {
      toast.error("Error al borrar")
    } finally {
      setDeletingId(null)
    }
  }

  function getAuthorColor(authorId: string): { bg: string; border: string; nameColor: string; barColor: string } {
    if (!entries.length) return { bg: "#fdf2f8", border: "#f9a8d4", nameColor: "#be185d", barColor: "#f9a8d4" }
    const firstAuthor = entries[0].author_id
    if (authorId === firstAuthor) {
      return { bg: "linear-gradient(135deg, #fdf2f8 0%, #fff0f5 100%)", border: "#f9a8d4", nameColor: "#be185d", barColor: "#ec4899" }
    }
    return { bg: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)", border: "#93c5fd", nameColor: "#1d4ed8", barColor: "#3b82f6" }
  }

  const charPercent = Math.round((text.length / 300) * 100)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{BOOK_CSS}</style>

      {/* Header */}
      <div style={{
        padding: "1rem 1rem 0.875rem", flexShrink: 0,
        background: "linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)",
        boxShadow: "0 2px 12px rgba(120,53,15,0.3)",
      }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.5rem" }}>
          <ChevronLeft size={16} /> Inicio
        </button>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color: "white", margin: 0 }}>📖 Nuestro Libro</h2>
            <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.6)", margin: "0.125rem 0 0" }}>Una historia escrita por los dos</p>
          </div>
          {entries.length > 0 && (
            <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.15)", borderRadius: "999px", padding: "2px 8px" }}>
              {entries.length} párrafo{entries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Book content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", background: "#fffbeb" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#b45309", fontSize: "0.875rem" }}>
            Cargando el libro...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", paddingBottom: "2rem", textAlign: "center" }}>
            <span style={{ fontSize: "4rem", lineHeight: 1 }}>📖</span>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 700, color: "#92400e", margin: 0 }}>El libro aún está en blanco</p>
            <p style={{ fontSize: "0.8125rem", color: "#b45309", margin: 0, maxWidth: "220px", lineHeight: 1.55 }}>
              Empieza tú la historia. Tu pareja añadirá el siguiente párrafo.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {entries.map((e, i) => {
              const colors = getAuthorColor(e.author_id)
              const isLast = i === entries.length - 1
              const isOwn = e.author_id === myUid
              return (
                <div
                  key={e.id}
                  style={{
                    background: colors.bg, border: `1.5px solid ${colors.border}`,
                    borderLeft: `4px solid ${colors.barColor}`,
                    borderRadius: "14px", padding: "0.875rem 1rem",
                    position: "relative",
                    animation: `bookEntryIn 0.35s ease both`,
                    animationDelay: `${Math.min(i * 0.04, 0.3)}s`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: colors.nameColor, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      {isOwn ? "✍️" : "📝"} {e.author_name}{isOwn ? " (tú)" : ""}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.5625rem", color: "#a16207", background: "#fef9c3", borderRadius: "999px", padding: "1px 6px", fontWeight: 600 }}>
                        {formatTs(e.created_at)}
                      </span>
                      {isOwn && isLast && (
                        <button
                          onClick={() => handleDelete(e)}
                          disabled={deletingId === e.id}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", opacity: deletingId === e.id ? 0.4 : 0.55 }}
                        >
                          <Trash2 size={12} color={colors.nameColor} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "0.9375rem", color: "#1c1917", lineHeight: 1.7, margin: 0 }}>
                    {e.content}
                  </p>
                  <span style={{ position: "absolute", top: "0.5rem", right: "0.875rem", fontSize: "0.6875rem", color: colors.nameColor, opacity: 0.4, fontFamily: "Georgia, serif" }}>
                    §{i + 1}
                  </span>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Write area */}
      <div style={{ flexShrink: 0, padding: "0.75rem 1rem", borderTop: "2px solid #fde68a", background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)" }}>
        {isMyTurn ? (
          <>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#92400e", margin: "0 0 0.5rem", display: "flex", alignItems: "center", gap: "0.25rem", animation: "turnPulse 2s ease-in-out infinite" }}>
              ✍️ {entries.length === 0 ? "Empieza la historia..." : "Tu turno — continúa la historia"}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe el siguiente párrafo..."
              maxLength={300}
              rows={3}
              style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid #fde68a", background: "white", color: "#1c1917", fontSize: "0.9375rem", fontFamily: "Georgia, serif", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.65, boxShadow: "inset 0 1px 4px rgba(0,0,0,0.04)" }}
            />
            {/* Progress bar */}
            <div style={{ height: 3, background: "#fef3c7", borderRadius: "999px", margin: "0.375rem 0 0.375rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${charPercent}%`, background: charPercent > 90 ? "#ef4444" : "#92400e", borderRadius: "999px", transition: "width 0.1s ease" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.625rem", color: charPercent > 90 ? "#ef4444" : "#b45309", fontWeight: 600 }}>{text.length}/300</span>
              <button
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "999px",
                  background: text.trim() && !submitting ? "linear-gradient(135deg, #92400e, #b45309)" : "#d6d3d1",
                  color: "white", border: "none", fontWeight: 700, fontSize: "0.8125rem",
                  fontFamily: "inherit", cursor: text.trim() && !submitting ? "pointer" : "default",
                  boxShadow: text.trim() ? "0 3px 10px rgba(146,64,14,0.35)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {submitting ? "Añadiendo..." : "Añadir →"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.5rem 0" }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #fde68a, #fbbf24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem", flexShrink: 0 }}>
              ⏳
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#92400e", margin: 0 }}>Esperando a tu pareja</p>
              <p style={{ fontSize: "0.6875rem", color: "#b45309", margin: 0 }}>Es su turno de continuar la historia</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
