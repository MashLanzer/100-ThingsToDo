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

  // Author color: first author gets pink, second gets blue
  function getAuthorColor(authorId: string): { bg: string; border: string; nameColor: string } {
    if (!entries.length) return { bg: "#fdf2f8", border: "#f9a8d4", nameColor: "#be185d" }
    const firstAuthor = entries[0].author_id
    if (authorId === firstAuthor) {
      return { bg: "#fdf2f8", border: "#f9a8d4", nameColor: "#be185d" }
    }
    return { bg: "#eff6ff", border: "#93c5fd", nameColor: "#1d4ed8" }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* header */}
      <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--border)", flexShrink: 0, background: "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "#92400e", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.375rem" }}>
          <ChevronLeft size={16} /> Inicio
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.25rem", fontWeight: 700, color: "#92400e", margin: 0 }}>📖 Nuestro Libro</h2>
          {entries.length > 0 && <span style={{ fontSize: "0.6875rem", color: "#b45309", fontWeight: 600 }}>{entries.length} párrafo{entries.length !== 1 ? "s" : ""}</span>}
        </div>
        <p style={{ fontSize: "0.6875rem", color: "#b45309", margin: "0.125rem 0 0" }}>Una historia escrita por los dos, turno a turno</p>
      </div>

      {/* book content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", background: "#fffbeb" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#b45309", fontSize: "0.875rem" }}>Cargando el libro...</div>
        ) : entries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.625rem", paddingBottom: "2rem", textAlign: "center" }}>
            <span style={{ fontSize: "3.5rem" }}>📖</span>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 700, color: "#92400e", margin: 0 }}>El libro aún está en blanco</p>
            <p style={{ fontSize: "0.8125rem", color: "#b45309", margin: 0, maxWidth: "220px", lineHeight: 1.5 }}>Empieza tú la historia. Tu pareja añadirá el siguiente párrafo.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {entries.map((e, i) => {
              const colors = getAuthorColor(e.author_id)
              const isLast = i === entries.length - 1
              const isOwn = e.author_id === myUid
              return (
                <div key={e.id} style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, borderRadius: "14px", padding: "0.875rem 1rem", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                    <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: colors.nameColor }}>
                      {e.author_name}{isOwn ? " (tú)" : ""}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.5625rem", color: "#b45309" }}>{formatTs(e.created_at)}</span>
                      {isOwn && isLast && (
                        <button
                          onClick={() => handleDelete(e)}
                          disabled={deletingId === e.id}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", opacity: deletingId === e.id ? 0.4 : 0.6 }}
                        >
                          <Trash2 size={12} color={colors.nameColor} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "0.9375rem", color: "#1c1917", lineHeight: 1.65, margin: 0 }}>
                    {e.content}
                  </p>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* write area */}
      <div style={{ flexShrink: 0, padding: "0.75rem 1rem", borderTop: "1px solid #fde68a", background: "#fefce8" }}>
        {isMyTurn ? (
          <>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#92400e", margin: "0 0 0.5rem" }}>
              {entries.length === 0 ? "✍️ Empieza la historia..." : "✍️ Tu turno — continúa la historia"}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe el siguiente párrafo..."
              maxLength={300}
              rows={3}
              style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid #fde68a", background: "white", color: "#1c1917", fontSize: "0.9375rem", fontFamily: "Georgia, serif", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6 }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.375rem" }}>
              <span style={{ fontSize: "0.625rem", color: "#b45309" }}>{text.length}/300</span>
              <button
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                style={{ padding: "0.5rem 1.25rem", borderRadius: "999px", background: text.trim() && !submitting ? "#92400e" : "#d6d3d1", color: "white", border: "none", fontWeight: 700, fontSize: "0.8125rem", fontFamily: "inherit", cursor: text.trim() && !submitting ? "pointer" : "default", transition: "background 0.15s" }}
              >
                {submitting ? "Añadiendo..." : "Añadir →"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0" }}>
            <span style={{ fontSize: "1.25rem" }}>⏳</span>
            <div>
              <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400e", margin: 0 }}>Esperando a tu pareja</p>
              <p style={{ fontSize: "0.6875rem", color: "#b45309", margin: 0 }}>Es su turno de continuar la historia</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
