"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, Trash2, BookOpen, Share2 } from "lucide-react"
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

const APP_CSS = `
@keyframes shimmer {
  0% { background-position: -400px 0 }
  100% { background-position: 400px 0 }
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(18px) }
  to   { opacity: 1; transform: translateY(0) }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(60px) }
  to   { opacity: 1; transform: translateX(0) }
}
@keyframes floatPage {
  0%   { opacity: 1; transform: translateY(0) rotate(0deg) }
  100% { opacity: 0; transform: translateY(-80px) rotate(15deg) }
}
@keyframes bobBook {
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(-8px) }
}
@keyframes blink {
  0%, 100% { opacity: 1 }
  50% { opacity: 0 }
}
.book-entry { animation: fadeSlideIn 0.35s ease both }
`

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

function relativeTs(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "hoy"
  if (days === 1) return "ayer"
  if (days < 30) return `hace ${days} días`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`
  const years = Math.floor(months / 12)
  return `hace ${years} año${years > 1 ? "s" : ""}`
}

function getChapter(index: number) { return Math.floor(index / 10) + 1 }

function AuthorAvatar({ name, color }: { name: string; color: string }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontSize: "0.6875rem", fontWeight: 800, color: "white",
      letterSpacing: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function SkeletonBook() {
  const shimmer: React.CSSProperties = {
    background: "linear-gradient(90deg, #fef3c7 25%, #fde68a 50%, #fef3c7 75%)",
    backgroundSize: "800px 100%",
    animation: "shimmer 1.4s infinite linear",
    borderRadius: 8,
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "0.5rem 0" }}>
      {[1, 2, 3].map((k) => (
        <div key={k} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ ...shimmer, width: 26, height: 26, borderRadius: "50%" }} />
            <div style={{ ...shimmer, width: 80, height: 10 }} />
          </div>
          <div style={{ ...shimmer, width: "100%", height: 12 }} />
          <div style={{ ...shimmer, width: "90%", height: 12 }} />
          <div style={{ ...shimmer, width: "75%", height: 12 }} />
        </div>
      ))}
    </div>
  )
}

function FloatPages({ active }: { active: boolean }) {
  if (!active) return null
  const emojis = ["📖", "✨", "📝", "✦", "📖"]
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {emojis.map((e, i) => (
        <span key={i} style={{
          position: "absolute",
          left: `${30 + i * 10}%`,
          bottom: "30%",
          fontSize: "1.5rem",
          animation: `floatPage 1s ease ${i * 0.15}s both`,
        }}>{e}</span>
      ))}
    </div>
  )
}

export function BookApp({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<BookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [myUid, setMyUid] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saveAnim, setSaveAnim] = useState(false)
  const [readMode, setReadMode] = useState(false)
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

  const totalChapters = entries.length > 0 ? getChapter(entries.length - 1) : 1
  const currentChapter = entries.length > 0 ? getChapter(entries.length - 1) : 1

  function getAuthorStyle(authorId: string): { bg: string; border: string; nameColor: string; avatarColor: string } {
    if (!entries.length) return { bg: "#fdf2f8", border: "#f9a8d4", nameColor: "#be185d", avatarColor: "#ec4899" }
    const firstAuthor = entries[0].author_id
    if (authorId === firstAuthor) {
      return { bg: "rgba(253,242,248,0.7)", border: "#f9a8d4", nameColor: "#be185d", avatarColor: "#ec4899" }
    }
    return { bg: "rgba(239,246,255,0.7)", border: "#93c5fd", nameColor: "#1d4ed8", avatarColor: "#3b82f6" }
  }

  function charCountColor() {
    if (text.length < 200) return "#16a34a"
    if (text.length < 270) return "#d97706"
    return "#dc2626"
  }

  async function handleSubmit() {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await authFetch("/api/book", { method: "POST", body: JSON.stringify({ content: text }) })
      if (res.status === 409) { toast.error("Espera a que tu pareja escriba su parte"); return }
      if (!res.ok) throw new Error()
      setText("")
      setSaveAnim(true)
      setTimeout(() => setSaveAnim(false), 1200)
      await loadEntries()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(entry: BookEntry) {
    setDeletingId(entry.id)
    setDeleteConfirm(null)
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

  async function handleShare() {
    const fullText = entries.map((e, i) => `§ ${i + 1}\n${e.content}`).join("\n\n— ✦ —\n\n")
    const shareText = `📖 Nuestro Libro\n\n${fullText}`
    if (navigator.share) {
      try { await navigator.share({ title: "Nuestro Libro", text: shareText }) } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText)
      toast.success("Historia copiada al portapapeles")
    }
  }

  const partnerLastEntry = !isMyTurn ? null : entries.filter(e => e.author_id !== myUid).at(-1) ?? null

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: "slideInRight 0.22s ease both" }}>
      <style>{APP_CSS}</style>
      <FloatPages active={saveAnim} />

      {/* header */}
      <div style={{
        padding: "1rem 1rem 0.875rem",
        flexShrink: 0,
        background: "linear-gradient(135deg, #1c0a00 0%, #3b1f0a 50%, #5c2e0e 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit" }}>
            <ChevronLeft size={16} /> Inicio
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setReadMode(r => !r)}
              style={{ background: readMode ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "999px", padding: "0.25rem 0.625rem", color: "white", fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <BookOpen size={12} /> {readMode ? "Normal" : "Leer"}
            </button>
            {entries.length > 0 && (
              <button
                onClick={handleShare}
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "999px", padding: "0.25rem 0.625rem", color: "white", fontSize: "0.6875rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
              >
                <Share2 size={12} /> Compartir
              </button>
            )}
          </div>
        </div>
        <h2 style={{ fontFamily: "'Fredoka One', Georgia, serif", fontSize: "1.375rem", fontWeight: 700, color: "white", margin: 0, letterSpacing: "-0.01em" }}>
          📖 Nuestro Libro
        </h2>
        <p style={{ fontSize: "0.6875rem", color: "rgba(255,220,150,0.9)", margin: "0.25rem 0 0", fontWeight: 500 }}>
          {entries.length === 0
            ? "Una historia escrita por los dos, turno a turno"
            : `Capítulo ${currentChapter} · ${entries.length} párrafo${entries.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* book content */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "1rem",
        background: "#fffbeb",
        backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #fde68a 27px, #fde68a 28px)",
        backgroundAttachment: "local",
      }}>
        {loading ? (
          <SkeletonBook />
        ) : entries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", paddingBottom: "2rem", textAlign: "center" }}>
            <span style={{ fontSize: "4rem", animation: "bobBook 2.5s ease-in-out infinite" }}>📖</span>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "1.125rem", fontWeight: 700, color: "#92400e", margin: 0 }}>
              La historia aún no ha comenzado
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#b45309", margin: 0, maxWidth: "220px", lineHeight: 1.6 }}>
              Sé el primero en escribir. Tu pareja añadirá el siguiente párrafo y juntos crearán algo único.
            </p>
          </div>
        ) : readMode ? (
          /* Read mode: continuous text */
          <div style={{ padding: "0.5rem 0.25rem" }}>
            {entries.map((e, i) => {
              const chapterHere = getChapter(i)
              const prevChapter = i > 0 ? getChapter(i - 1) : chapterHere
              const isChapterStart = i === 0 || chapterHere !== prevChapter
              return (
                <div key={e.id}>
                  {isChapterStart && (
                    <div style={{ textAlign: "center", margin: "1.5rem 0 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ flex: 1, height: 1, background: "#d97706" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#92400e", fontFamily: "Georgia, serif", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        — Capítulo {chapterHere} —
                      </span>
                      <div style={{ flex: 1, height: 1, background: "#d97706" }} />
                    </div>
                  )}
                  <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", color: "#1c1917", lineHeight: 1.8, letterSpacing: "0.01em", margin: "0 0 0.5rem" }}>
                    {e.content}
                  </p>
                  {i < entries.length - 1 && (
                    <p style={{ textAlign: "center", color: "#d97706", margin: "0.75rem 0", fontSize: "0.875rem" }}>— ✦ —</p>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        ) : (
          /* Normal mode: cards */
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {entries.map((e, i) => {
              const colors = getAuthorStyle(e.author_id)
              const isLast = i === entries.length - 1
              const isOwn = e.author_id === myUid
              const chapterHere = getChapter(i)
              const prevChapter = i > 0 ? getChapter(i - 1) : chapterHere
              const isChapterStart = i === 0 || chapterHere !== prevChapter
              return (
                <div key={e.id} className="book-entry" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  {isChapterStart && (
                    <div style={{ textAlign: "center", margin: i === 0 ? "0 0 1rem" : "1.5rem 0 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ flex: 1, height: 1, background: "#d97706" }} />
                      <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#92400e", fontFamily: "Georgia, serif", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                        — Capítulo {chapterHere} —
                      </span>
                      <div style={{ flex: 1, height: 1, background: "#d97706" }} />
                    </div>
                  )}

                  <div style={{
                    background: colors.bg,
                    border: `1.5px solid ${colors.border}`,
                    borderRadius: "14px",
                    padding: "0.875rem 1rem",
                    backdropFilter: "blur(4px)",
                    marginBottom: i < entries.length - 1 ? "0.25rem" : 0,
                  }}>
                    {/* header row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <AuthorAvatar name={e.author_name} color={colors.avatarColor} />
                        <div>
                          <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: colors.nameColor, display: "block" }}>
                            {e.author_name}{isOwn ? " (tú)" : ""}
                          </span>
                          <span style={{ fontSize: "0.5625rem", color: "#92400e", opacity: 0.7 }}>
                            § {i + 1} · {relativeTs(e.created_at)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.5625rem", color: "#b45309" }}>{formatTs(e.created_at)}</span>
                        {isOwn && isLast && deleteConfirm !== e.id && (
                          <button
                            onClick={() => setDeleteConfirm(e.id)}
                            disabled={deletingId === e.id}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", display: "flex", opacity: 0.55 }}
                          >
                            <Trash2 size={12} color={colors.nameColor} />
                          </button>
                        )}
                        {isOwn && isLast && deleteConfirm === e.id && (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button onClick={() => handleDelete(e)} style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "0.5625rem", fontWeight: 700, padding: "2px 6px", cursor: "pointer" }}>
                              {deletingId === e.id ? "..." : "Borrar"}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} style={{ background: "#e5e7eb", color: "#374151", border: "none", borderRadius: "6px", fontSize: "0.5625rem", fontWeight: 700, padding: "2px 6px", cursor: "pointer" }}>
                              No
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* paragraph text */}
                    <p style={{ fontFamily: "Georgia, serif", fontSize: "1rem", color: "#1c1917", lineHeight: 1.8, letterSpacing: "0.01em", margin: 0 }}>
                      {e.content}
                    </p>
                  </div>

                  {/* narrative separator between entries */}
                  {i < entries.length - 1 && (
                    <p style={{ textAlign: "center", color: "#d97706", margin: "0.5rem 0", fontSize: "0.8125rem", opacity: 0.6 }}>— ✦ —</p>
                  )}
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* write area */}
      <div style={{ flexShrink: 0, padding: "0.75rem 1rem", borderTop: "2px solid #fde68a", background: "#fefce8" }}>
        {isMyTurn ? (
          <>
            {/* partner context reminder */}
            {partnerLastEntry && (
              <div style={{ background: "rgba(180,83,9,0.08)", borderLeft: "3px solid #d97706", borderRadius: "0 8px 8px 0", padding: "0.5rem 0.75rem", marginBottom: "0.625rem" }}>
                <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#92400e", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Continúa esto...</p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "0.8125rem", color: "#1c1917", lineHeight: 1.5, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {partnerLastEntry.content}
                </p>
              </div>
            )}

            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#92400e", margin: "0 0 0.5rem" }}>
              {entries.length === 0 ? "✍️ Empieza la historia..." : "✍️ Tu turno — continúa la historia"}
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe el siguiente párrafo..."
              maxLength={300}
              rows={3}
              style={{
                width: "100%", padding: "0.625rem 0.75rem",
                borderRadius: "8px", border: "1.5px solid #d97706",
                background: "#fffbf0", color: "#1c1917",
                fontSize: "1rem", fontFamily: "Georgia, serif",
                outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.7,
              }}
            />

            {/* preview */}
            {text.trim().length > 0 && (
              <div style={{ marginTop: "0.5rem", padding: "0.625rem 0.75rem", background: "rgba(253,242,248,0.7)", border: "1.5px solid #f9a8d4", borderRadius: "10px" }}>
                <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#be185d", margin: "0 0 0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vista previa</p>
                <p style={{ fontFamily: "Georgia, serif", fontSize: "0.875rem", color: "#1c1917", lineHeight: 1.7, margin: 0 }}>{text}</p>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.375rem" }}>
              <span style={{ fontSize: "0.625rem", color: charCountColor(), fontWeight: 600, transition: "color 0.2s" }}>
                {text.length}/300
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting || !text.trim()}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "999px",
                  background: text.trim() && !submitting ? "linear-gradient(135deg, #3b1f0a, #92400e)" : "#d6d3d1",
                  color: "white", border: "none", fontWeight: 700, fontSize: "0.8125rem",
                  fontFamily: "inherit", cursor: text.trim() && !submitting ? "pointer" : "default",
                  transition: "background 0.15s",
                }}
              >
                {submitting ? "Añadiendo..." : "Añadir →"}
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.375rem 0" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <span style={{ fontSize: "1.75rem" }}>📝</span>
              <span style={{
                position: "absolute", bottom: 0, right: -2,
                fontSize: "0.6rem", fontWeight: 900,
                color: "#92400e", letterSpacing: 0,
              }}>
                <span style={{ animation: "blink 1s step-start infinite" }}>•</span>
                <span style={{ animation: "blink 1s step-start 0.33s infinite" }}>•</span>
                <span style={{ animation: "blink 1s step-start 0.66s infinite" }}>•</span>
              </span>
            </div>
            <div>
              <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#92400e", margin: 0 }}>Tu pareja está escribiendo...</p>
              <p style={{ fontSize: "0.6875rem", color: "#b45309", margin: "0.125rem 0 0" }}>Es su turno de continuar la historia</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
