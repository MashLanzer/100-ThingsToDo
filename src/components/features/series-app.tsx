"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, Search, X, Plus, Trash2, LayoutGrid, List, Share2 } from "lucide-react"
import { toast } from "sonner"
import { getFirebaseToken } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"

type SeriesStatus = "wishlist" | "watching" | "completed" | "paused" | "abandoned"

interface CoupleEntry {
  id: string
  tvmaze_id: number
  title: string
  image_url: string | null
  status: SeriesStatus
  current_season: number
  current_episode: number
  added_by: string
  created_at: string
}

interface TVMazeShow {
  id: number
  name: string
  image: { medium: string; original: string } | null
  network: { name: string } | null
  webChannel: { name: string } | null
  status: string
  genres: string[]
  summary: string | null
}

const STATUS_META: Record<SeriesStatus, { label: string; emoji: string; color: string }> = {
  wishlist:  { label: "Quiero ver",  emoji: "🔖", color: "#0369a1" },
  watching:  { label: "Viendo",      emoji: "👀", color: "#7c3aed" },
  completed: { label: "Terminada",   emoji: "✅", color: "#059669" },
  paused:    { label: "Pausada",     emoji: "⏸",  color: "#b45309" },
  abandoned: { label: "Abandonada",  emoji: "❌", color: "#dc2626" },
}

const STATUS_ORDER: SeriesStatus[] = ["watching", "wishlist", "paused", "completed", "abandoned"]

const GENRE_COLORS: Record<string, string> = {
  Drama: "#7c3aed", Comedy: "#059669", Thriller: "#dc2626",
  Action: "#b45309", Romance: "#be185d", "Science-Fiction": "#0369a1",
  Horror: "#991b1b", Animation: "#d97706", Crime: "#374151",
  Adventure: "#0891b2", Fantasy: "#6d28d9", Mystery: "#6b7280",
}

const APP_CSS = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
`

function stripHtml(html: string | null) {
  if (!html) return ""
  return html.replace(/<[^>]*>/g, "").slice(0, 200)
}

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await getFirebaseToken()
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
}

function SkeletonList() {
  const bar = (w: string, h: number) => ({
    height: h, width: w, borderRadius: 4,
    background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s ease infinite",
  })
  return (
    <div>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ ...bar("56px", 78), borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div style={bar("70%", 14)} />
            <div style={bar("45%", 11)} />
          </div>
        </div>
      ))}
    </div>
  )
}

interface Props { onBack: () => void }
type View = "list" | "search" | "detail"

export function SeriesApp({ onBack }: Props) {
  const { user } = useAuth()
  const [view, setView] = useState<View>("list")
  const [entries, setEntries] = useState<CoupleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<SeriesStatus | "all" | "juntos">("all")
  const [gridView, setGridView] = useState(false)

  const [searchQ, setSearchQ] = useState("")
  const [searchResults, setSearchResults] = useState<TVMazeShow[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selected, setSelected] = useState<CoupleEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [detailShow, setDetailShow] = useState<TVMazeShow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/series")
      if (res.ok) setEntries(await res.json())
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchQ)}`)
        const data = await res.json()
        setSearchResults((data as { show: TVMazeShow }[]).map(r => r.show).slice(0, 10))
      } catch { } finally { setSearching(false) }
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQ])

  useEffect(() => {
    if (view === "detail" && selected) {
      setDetailShow(null)
      fetch(`https://api.tvmaze.com/shows/${selected.tvmaze_id}`)
        .then(r => r.json())
        .then((d: TVMazeShow) => setDetailShow(d))
        .catch(() => {})
    }
  }, [view, selected])

  async function handleAdd(show: TVMazeShow) {
    const alreadyMine = entries.some(e => e.tvmaze_id === show.id && e.added_by === user?.uid)
    if (alreadyMine) { toast.info("Ya tienes esta serie en tu lista"); return }
    setAdding(show.id)
    try {
      const res = await authFetch("/api/series", {
        method: "POST",
        body: JSON.stringify({ tvmaze_id: show.id, title: show.name, image_url: show.image?.medium ?? null, status: "wishlist" }),
      })
      if (!res.ok) { toast.error("No se pudo añadir"); return }
      const entry: CoupleEntry = await res.json()
      setEntries(prev => [entry, ...prev])
      toast.success(`"${show.name}" añadida`)
    } catch { toast.error("Error al añadir") } finally { setAdding(null) }
  }

  async function handlePatch(id: string, updates: Partial<Pick<CoupleEntry, "status" | "current_season" | "current_episode">>) {
    setSaving(true)
    try {
      const res = await authFetch(`/api/series/${id}`, { method: "PATCH", body: JSON.stringify(updates) })
      if (!res.ok) { toast.error("No se pudo guardar"); return }
      const updated: CoupleEntry = await res.json()
      setEntries(prev => prev.map(e => e.id === id ? updated : e))
      if (selected?.id === id) setSelected(updated)
    } catch { toast.error("Error al guardar") } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await authFetch(`/api/series/${id}`, { method: "DELETE" })
      setEntries(prev => prev.filter(e => e.id !== id))
      setSelected(null); setView("list"); setDeleteConfirm(false)
      toast.success("Serie eliminada")
    } catch { toast.error("Error al eliminar") }
  }

  function handleShare() {
    if (!selected) return
    const msg = (selected.status === "watching" || selected.status === "paused")
      ? `📺 Estamos viendo ${selected.title} — T${selected.current_season} Ep ${selected.current_episode} 🎬`
      : `📺 ${selected.title} — ${STATUS_META[selected.status].emoji} ${STATUS_META[selected.status].label}`
    if (navigator.share) { navigator.share({ text: msg }).catch(() => {}) }
    else { navigator.clipboard.writeText(msg).then(() => toast.success("Copiado al portapapeles")) }
  }

  const myUid = user?.uid ?? ""
  const myEntries = entries.filter(e => e.added_by === myUid)
  const partnerEntries = entries.filter(e => e.added_by !== myUid)
  const myIds = new Set(myEntries.map(e => e.tvmaze_id))
  const partnerIds = new Set(partnerEntries.map(e => e.tvmaze_id))
  const juntosIds = new Set([...myIds].filter(id => partnerIds.has(id)))
  const watchingEntries = myEntries.filter(e => e.status === "watching")

  const filtered = myEntries.filter(e => {
    if (activeFilter === "all") return true
    if (activeFilter === "juntos") return juntosIds.has(e.tvmaze_id)
    return e.status === activeFilter
  })

  const listEntries = activeFilter === "all" ? filtered.filter(e => e.status !== "watching") : filtered
  const grouped: Record<string, CoupleEntry[]> = {}
  STATUS_ORDER.forEach(s => {
    if (activeFilter === "all" && s === "watching") return
    const items = listEntries.filter(e => e.status === s)
    if (items.length) grouped[s] = items
  })

  const countOf = (k: string) => {
    if (k === "all") return myEntries.length
    if (k === "juntos") return juntosIds.size
    return myEntries.filter(e => e.status === k).length
  }

  // ── SEARCH VIEW ──────────────────────────────────────────────────────────────

  if (view === "search") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{APP_CSS}</style>
      <div style={{ padding: "0.75rem 1rem 0.875rem", background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", flexShrink: 0 }}>
        <button
          onClick={() => { setView("list"); setSearchQ(""); setSearchResults([]) }}
          style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "999px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: "0.75rem", marginBottom: "0.75rem", fontFamily: "inherit", padding: "0.2rem 0.625rem 0.2rem 0.375rem" }}
        >
          <ChevronLeft size={14} /> Mi lista
        </button>
        {/* #20 Floating search bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "white", borderRadius: "16px", padding: "0.5rem 0.875rem", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", border: "1px solid rgba(0,0,0,0.06)" }}>
          <Search size={15} style={{ color: "#9ca3af", flexShrink: 0 }} />
          <input autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar serie o película..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "0.875rem", color: "#1c1917", fontFamily: "inherit" }} />
          {searchQ && (
            <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9ca3af", display: "flex" }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {searching && <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.8125rem", padding: "1.5rem" }}>Buscando...</p>}
        {!searching && searchQ && !searchResults.length && <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.8125rem", padding: "1.5rem" }}>Sin resultados para &ldquo;{searchQ}&rdquo;</p>}
        {!searching && !searchQ && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", gap: "0.5rem" }}>
            <span style={{ fontSize: "2.5rem" }}>🔍</span>
            <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.8125rem", margin: 0 }}>Escribe para buscar series y películas</p>
          </div>
        )}
        {/* #17 stagger animation, #18 bigger poster, #19 status chip */}
        {searchResults.map((show, idx) => {
          const alreadyMine = entries.some(e => e.tvmaze_id === show.id && e.added_by === myUid)
          const network = show.network?.name ?? show.webChannel?.name
          const tvStatus = show.status === "Running" ? { label: "En emisión", bg: "#dcfce7", color: "#166534" }
            : show.status === "Ended" ? { label: "Finalizada", bg: "#fee2e2", color: "#991b1b" }
            : show.status ? { label: "Cancelada", bg: "#fef3c7", color: "#92400e" } : null
          return (
            <div key={show.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)", animation: "fadeSlideIn 0.28s ease both", animationDelay: `${idx * 0.055}s` }}>
              {show.image?.medium
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={show.image.medium} alt={show.name} style={{ width: 60, height: 84, objectFit: "cover", borderRadius: "8px", flexShrink: 0, border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} />
                : <div style={{ width: 60, height: 84, borderRadius: "8px", background: "linear-gradient(135deg, #1e1b4b, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.5rem" }}>📺</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{show.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                  {network && <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{network}</span>}
                  {tvStatus && <span style={{ fontSize: "0.5625rem", fontWeight: 700, background: tvStatus.bg, color: tvStatus.color, borderRadius: "999px", padding: "1px 6px" }}>{tvStatus.label}</span>}
                  {show.genres?.slice(0, 2).map(g => (
                    <span key={g} style={{ fontSize: "0.5625rem", fontWeight: 600, background: `${GENRE_COLORS[g] ?? "#6b7280"}18`, color: GENRE_COLORS[g] ?? "#6b7280", borderRadius: "999px", padding: "1px 5px" }}>{g}</span>
                  ))}
                </div>
                {show.summary && (
                  <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", margin: "0.3rem 0 0", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                    {stripHtml(show.summary)}
                  </p>
                )}
              </div>
              <button disabled={alreadyMine || adding === show.id} onClick={() => handleAdd(show)}
                style={{ flexShrink: 0, width: 34, height: 34, borderRadius: "50%", border: "none", cursor: alreadyMine ? "default" : "pointer", background: alreadyMine ? "#d1fae5" : "var(--primary)", color: alreadyMine ? "#059669" : "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: alreadyMine ? "none" : "0 2px 8px rgba(0,0,0,0.2)", transition: "background 0.15s" }}
              >
                {alreadyMine ? "✓" : adding === show.id ? "…" : <Plus size={16} />}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────────

  if (view === "detail" && selected) {
    const meta = STATUS_META[selected.status]
    const isOwn = selected.added_by === myUid
    const network = detailShow?.network?.name ?? detailShow?.webChannel?.name
    const genres = detailShow?.genres ?? []
    const tvStatus = detailShow?.status === "Running" ? { label: "En emisión", bg: "#dcfce7", color: "#166534" }
      : detailShow?.status === "Ended" ? { label: "Finalizada", bg: "#fee2e2", color: "#991b1b" }
      : detailShow?.status ? { label: "Cancelada", bg: "#fef3c7", color: "#92400e" } : null

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: "slideInRight 0.22s ease both" }}>
        <style>{APP_CSS}</style>
        {/* #11 Cover with blur background — 240px */}
        <div style={{ position: "relative", height: 240, flexShrink: 0, overflow: "hidden", background: "#1e1b4b" }}>
          {selected.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.image_url} alt="" style={{ position: "absolute", inset: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)", objectFit: "cover", filter: "blur(18px)", transform: "scale(1.1)", opacity: 0.7 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)" }} />
          <button onClick={() => { setView("list"); setSelected(null); setDeleteConfirm(false) }}
            style={{ position: "absolute", top: "0.75rem", left: "0.75rem", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
          >
            <ChevronLeft size={18} />
          </button>
          <div style={{ position: "absolute", bottom: "0.875rem", left: "0.875rem", right: "0.875rem" }}>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{selected.title}</p>
            {/* #12 network + genre chips */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.375rem", flexWrap: "wrap" }}>
              {network && <span style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>{network}</span>}
              {tvStatus && <span style={{ fontSize: "0.5625rem", fontWeight: 700, background: tvStatus.bg, color: tvStatus.color, borderRadius: "999px", padding: "1.5px 6px" }}>{tvStatus.label}</span>}
              {genres.slice(0, 3).map(g => (
                <span key={g} style={{ fontSize: "0.5625rem", fontWeight: 600, background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.9)", borderRadius: "999px", padding: "1.5px 6px", backdropFilter: "blur(4px)" }}>{g}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {isOwn ? (
            <>
              {/* #14 Vibrant status chips */}
              <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.625rem" }}>Estado</p>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                {(Object.entries(STATUS_META) as [SeriesStatus, typeof STATUS_META[SeriesStatus]][]).map(([s, m]) => (
                  <button key={s} disabled={saving} onClick={() => handlePatch(selected.id, { status: s })}
                    style={{ padding: "0.35rem 0.75rem", borderRadius: "999px", border: `1.5px solid ${selected.status === s ? m.color : "var(--border)"}`, background: selected.status === s ? m.color : "transparent", color: selected.status === s ? "white" : "var(--foreground-muted)", fontWeight: 700, fontSize: "0.6875rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", boxShadow: selected.status === s ? `0 2px 8px ${m.color}40` : "none" }}
                  >
                    {selected.status === s ? "✓ " : ""}{m.emoji} {m.label}
                  </button>
                ))}
              </div>

              {/* #13 Progress pill */}
              {(selected.status === "watching" || selected.status === "paused") && (
                <>
                  <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.625rem" }}>Progreso</p>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                    {(["current_season", "current_episode"] as const).map(field => {
                      const isS = field === "current_season"
                      const val = selected[field]
                      return (
                        <div key={field} style={{ flex: 1, background: `${meta.color}10`, borderRadius: "14px", padding: "0.625rem 0.75rem", border: `1.5px solid ${meta.color}30`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <p style={{ fontSize: "0.5625rem", color: meta.color, fontWeight: 700, margin: "0 0 0.1rem", textTransform: "uppercase" }}>{isS ? "Temporada" : "Episodio"}</p>
                            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: meta.color, margin: 0, lineHeight: 1 }}>{isS ? "T" : "Ep"}{val}</p>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                            <button disabled={saving} onClick={() => handlePatch(selected.id, { [field]: val + 1 })}
                              style={{ background: meta.color, border: "none", borderRadius: "6px", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", fontWeight: 700, fontSize: "0.875rem" }}>+</button>
                            <button disabled={saving || val <= (isS ? 1 : 0)} onClick={() => handlePatch(selected.id, { [field]: val - 1 })}
                              style={{ background: `${meta.color}20`, border: "none", borderRadius: "6px", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: meta.color, fontWeight: 700, fontSize: "1rem" }}>−</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* #16 Share progress */}
                  <button onClick={handleShare}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: `${meta.color}10`, border: `1.5px solid ${meta.color}30`, borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", color: meta.color, fontWeight: 600, fontSize: "0.8125rem", fontFamily: "inherit", marginBottom: "1.25rem" }}
                  >
                    <Share2 size={14} /> Compartir progreso con pareja
                  </button>
                </>
              )}

              {/* #15 Delete - less aggressive */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                {deleteConfirm ? (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleDelete(selected.id)}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", color: "white", background: "#dc2626", border: "none", borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                      <Trash2 size={13} /> Sí, eliminar
                    </button>
                    <button onClick={() => setDeleteConfirm(false)}
                      style={{ padding: "0.5rem 0.875rem", borderRadius: "10px", border: "1.5px solid var(--border)", background: "transparent", color: "var(--foreground-muted)", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)}
                    style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--foreground-muted)", background: "none", border: "1.5px solid var(--border)", borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 500, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                    <Trash2 size={13} /> Eliminar de mi lista
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--muted)", borderRadius: "14px", padding: "0.875rem" }}>
              <span style={{ fontSize: "1.5rem" }}>{STATUS_META[selected.status].emoji}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", margin: 0 }}>Tu pareja la tiene en su lista</p>
                <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: "0.125rem 0 0" }}>{STATUS_META[selected.status].label}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────

  const filterTabs: { key: SeriesStatus | "all" | "juntos"; label: string; emoji: string }[] = [
    { key: "all",       label: "Todo",       emoji: "📋" },
    ...(juntosIds.size > 0 ? [{ key: "juntos" as const, label: "Juntos", emoji: "💕" }] : []),
    { key: "watching",  label: "Viendo",     emoji: "👀" },
    { key: "wishlist",  label: "Quiero ver", emoji: "🔖" },
    { key: "completed", label: "Terminadas", emoji: "✅" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      <style>{APP_CSS}</style>

      {/* #1 Cinematic header */}
      <div style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", flexShrink: 0, padding: "0.75rem 1rem 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <div>
            <button onClick={onBack}
              style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "999px", cursor: "pointer", color: "rgba(255,255,255,0.75)", fontWeight: 600, fontSize: "0.75rem", marginBottom: "0.5rem", fontFamily: "inherit", padding: "0.2rem 0.625rem 0.2rem 0.375rem" }}
            >
              <ChevronLeft size={14} /> Inicio
            </button>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.1 }}>🎬 Peliculero</h2>
            {/* #23 count */}
            <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.55)", margin: "0.2rem 0 0", fontWeight: 500 }}>
              {myEntries.length} {myEntries.length === 1 ? "serie" : "series"}{watchingEntries.length > 0 ? ` · ${watchingEntries.length} viendo` : ""}
            </p>
          </div>
          {/* #6 grid toggle */}
          <button onClick={() => setGridView(v => !v)}
            style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.85)", marginTop: "0.25rem" }}>
            {gridView ? <List size={15} /> : <LayoutGrid size={15} />}
          </button>
        </div>

        {/* #4 Filter tabs with counts */}
        <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", paddingBottom: "0.75rem", paddingTop: "0.375rem" }}>
          {filterTabs.map(tab => {
            const cnt = countOf(tab.key)
            return (
              <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
                style={{ flexShrink: 0, padding: "0.3rem 0.625rem", borderRadius: "999px", border: `1.5px solid ${activeFilter === tab.key ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.18)"}`, background: activeFilter === tab.key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", color: activeFilter === tab.key ? "white" : "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.6875rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {tab.emoji} {tab.label}{cnt > 0 ? ` (${cnt})` : ""}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? <SkeletonList /> : filtered.length === 0 ? (
          /* #8 improved empty state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80%", gap: "0.75rem", padding: "1.5rem" }}>
            <span style={{ fontSize: "3.5rem", animation: "fadeSlideIn 0.4s ease both" }}>{activeFilter === "juntos" ? "💕" : "🎬"}</span>
            <p style={{ fontWeight: 700, color: "var(--foreground)", fontSize: "1rem", margin: 0, textAlign: "center" }}>{activeFilter === "juntos" ? "Nada en común aún" : "Tu lista está vacía"}</p>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", margin: 0, textAlign: "center", lineHeight: 1.5, maxWidth: 220 }}>
              {activeFilter === "juntos" ? "Cuando los dos añadáis la misma serie aparecerá aquí" : "Pulsa el botón + para buscar series y películas"}
            </p>
            {activeFilter === "all" && (
              <button onClick={() => setView("search")}
                style={{ marginTop: "0.5rem", background: "var(--primary)", color: "white", border: "none", borderRadius: "999px", padding: "0.625rem 1.5rem", fontWeight: 700, fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                + Añadir primera serie
              </button>
            )}
          </div>
        ) : (
          <>
            {/* #9 Juntos highlighted section */}
            {activeFilter === "all" && juntosIds.size > 0 && (
              <div style={{ margin: "0.75rem 0.875rem 0", background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", borderRadius: "16px", padding: "0.75rem", border: "1.5px solid #f9a8d4" }}>
                <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem" }}>💕 En común ({juntosIds.size})</p>
                <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto" }}>
                  {myEntries.filter(e => juntosIds.has(e.tvmaze_id)).map(e => (
                    <button key={e.id} onClick={() => { setSelected(e); setView("detail") }}
                      style={{ flexShrink: 0, width: 48, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}>
                      {e.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={e.image_url} alt={e.title} style={{ width: 48, height: 66, objectFit: "cover", borderRadius: "8px", border: "2px solid #f9a8d4" }} />
                        : <div style={{ width: 48, height: 66, borderRadius: "8px", background: "#fce7f3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: "2px solid #f9a8d4" }}>📺</div>
                      }
                      <p style={{ fontSize: "0.5rem", color: "#be185d", margin: "0.2rem 0 0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* #5 Viendo ahora hero */}
            {activeFilter === "all" && watchingEntries.length > 0 && (
              <div style={{ padding: "0.75rem 0.875rem 0" }}>
                <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem" }}>👀 Viendo ahora</p>
                <div style={{ display: "flex", gap: "0.625rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                  {watchingEntries.map(e => (
                    <button key={e.id} onClick={() => { setSelected(e); setView("detail") }}
                      style={{ flexShrink: 0, width: 96, background: "none", border: "none", cursor: "pointer", padding: 0, position: "relative" }}>
                      {e.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={e.image_url} alt={e.title} style={{ width: 96, height: 134, objectFit: "cover", borderRadius: "10px", border: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} />
                        : <div style={{ width: 96, height: 134, borderRadius: "10px", background: "linear-gradient(135deg, #1e1b4b, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>📺</div>
                      }
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.88))", borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px", padding: "1.25rem 0.375rem 0.375rem" }}>
                        <p style={{ fontSize: "0.5625rem", color: "white", margin: 0, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                        <p style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.65)", margin: "0.1rem 0 0" }}>T{e.current_season} · Ep {e.current_episode}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* #6 Grid or list */}
            {gridView ? (
              <div style={{ padding: "0.75rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                {filtered.map(e => (
                  <button key={e.id} onClick={() => { setSelected(e); setView("detail") }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}>
                    {e.image_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={e.image_url} alt={e.title} style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                      : <div style={{ width: "100%", aspectRatio: "2/3", borderRadius: "8px", background: "linear-gradient(135deg, #1e1b4b, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>📺</div>
                    }
                    <p style={{ fontSize: "0.5625rem", fontWeight: 600, color: "var(--foreground)", margin: "0.25rem 0 0.125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                    <span style={{ fontSize: "0.5rem" }}>{STATUS_META[e.status].emoji}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {Object.entries(grouped).map(([status, items]) => {
                  const smeta = STATUS_META[status as SeriesStatus]
                  return (
                    <div key={status}>
                      <div style={{ padding: "0.75rem 1rem 0.375rem", display: "flex", alignItems: "center", gap: "0.375rem", borderBottom: `2px solid ${smeta.color}20` }}>
                        <span style={{ fontSize: "0.875rem" }}>{smeta.emoji}</span>
                        <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: smeta.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{smeta.label}</span>
                        <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>({items.length})</span>
                      </div>
                      {items.map(entry => {
                        const isJuntos = juntosIds.has(entry.tvmaze_id)
                        const emeta = STATUS_META[entry.status]
                        return (
                          <button key={entry.id} onClick={() => { setSelected(entry); setView("detail") }}
                            style={{ width: "100%", display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem 0.75rem 0.875rem", border: "none", background: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${emeta.color}` }}>
                            {/* #3 bigger poster 56×78 */}
                            {entry.image_url
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={entry.image_url} alt={entry.title} style={{ width: 56, height: 78, objectFit: "cover", borderRadius: "8px", flexShrink: 0, border: "1px solid var(--border)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }} />
                              : <div style={{ width: 56, height: 78, borderRadius: "8px", background: "linear-gradient(135deg, #1e1b4b, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.25rem" }}>📺</div>
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {entry.title}{isJuntos && <span style={{ marginLeft: "0.375rem" }}>💕</span>}
                              </p>
                              {/* #13 progress pill in list */}
                              {(entry.status === "watching" || entry.status === "paused") && (
                                <div style={{ display: "inline-flex", alignItems: "center", marginTop: "0.3rem", background: `${emeta.color}12`, borderRadius: "999px", padding: "2px 8px", border: `1px solid ${emeta.color}25` }}>
                                  <span style={{ fontSize: "0.625rem", color: emeta.color, fontWeight: 700 }}>T{entry.current_season} · Ep {entry.current_episode}</span>
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: "0.875rem", color: "var(--foreground-muted)", flexShrink: 0 }}>›</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}

                {/* #10 partner carousel */}
                {partnerEntries.length > 0 && activeFilter === "all" && (
                  <div style={{ padding: "0.875rem", borderTop: "2px solid var(--border)", marginTop: "0.25rem" }}>
                    <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.625rem" }}>
                      Lista de tu pareja ({partnerEntries.length})
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                      {partnerEntries.map(e => (
                        <button key={e.id} onClick={() => { setSelected(e); setView("detail") }}
                          style={{ flexShrink: 0, width: 52, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "center" }}>
                          {e.image_url
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={e.image_url} alt={e.title} style={{ width: 52, height: 72, objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />
                            : <div style={{ width: 52, height: 72, borderRadius: "8px", background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>📺</div>
                          }
                          <p style={{ fontSize: "0.5rem", color: "var(--foreground-muted)", margin: "0.25rem 0 0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* #22 FAB */}
      {!loading && (
        <button onClick={() => setView("search")}
          style={{ position: "absolute", bottom: "1rem", right: "1rem", width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4c1d95)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(124,58,237,0.45)", zIndex: 10 }}>
          <Plus size={22} />
        </button>
      )}
    </div>
  )
}
