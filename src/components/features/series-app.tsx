"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, Search, X, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { getFirebaseToken } from "@/lib/firebase/client"
import { PhoneLoader } from "@/components/features/phone-loader"
import { useAuth } from "@/hooks/use-auth"

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<SeriesStatus, { label: string; emoji: string; color: string; bg: string }> = {
  wishlist:  { label: "Quiero ver",  emoji: "🔖", color: "#0369a1", bg: "#eff6ff" },
  watching:  { label: "Viendo",      emoji: "👀", color: "#7c3aed", bg: "#f5f3ff" },
  completed: { label: "Terminada",   emoji: "✅", color: "#059669", bg: "#ecfdf5" },
  paused:    { label: "Pausada",     emoji: "⏸",  color: "#b45309", bg: "#fffbeb" },
  abandoned: { label: "Abandonada",  emoji: "❌", color: "#dc2626", bg: "#fef2f2" },
}

const STATUS_ORDER: SeriesStatus[] = ["watching", "wishlist", "paused", "completed", "abandoned"]

const SERIES_CSS = `
@keyframes seriesCardIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes searchResultIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }
type View = "list" | "search" | "detail"

export function SeriesApp({ onBack }: Props) {
  const { user } = useAuth()
  const [view, setView] = useState<View>("list")
  const [entries, setEntries] = useState<CoupleEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<SeriesStatus | "all" | "juntos">("all")

  // Search
  const [searchQ, setSearchQ] = useState("")
  const [searchResults, setSearchResults] = useState<TVMazeShow[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<number | null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detail / edit
  const [selected, setSelected] = useState<CoupleEntry | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Data ────────────────────────────────────────────────────────────────────

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/series")
      if (res.ok) setEntries(await res.json())
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  // ── TVMaze search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(searchQ)}`)
        const data = await res.json()
        setSearchResults((data as { show: TVMazeShow }[]).map(r => r.show).slice(0, 10))
      } catch { /* silent */ } finally { setSearching(false) }
    }, 400)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  }, [searchQ])

  // ── Actions ──────────────────────────────────────────────────────────────────

  async function handleAdd(show: TVMazeShow, status: SeriesStatus = "wishlist") {
    const alreadyMine = entries.some(e => e.tvmaze_id === show.id && e.added_by === user?.uid)
    if (alreadyMine) { toast.info("Ya tienes esta serie en tu lista"); return }
    setAdding(show.id)
    try {
      const res = await authFetch("/api/series", {
        method: "POST",
        body: JSON.stringify({ tvmaze_id: show.id, title: show.name, image_url: show.image?.medium ?? null, status }),
      })
      if (!res.ok) { toast.error("No se pudo añadir"); return }
      const entry: CoupleEntry = await res.json()
      setEntries(prev => [entry, ...prev])
      toast.success(`"${show.name}" añadida a tu lista`)
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
      setSelected(null)
      setView("list")
      toast.success("Serie eliminada")
    } catch { toast.error("Error al eliminar") }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const myUid = user?.uid ?? ""

  const myIds = new Set(entries.filter(e => e.added_by === myUid).map(e => e.tvmaze_id))
  const partnerIds = new Set(entries.filter(e => e.added_by !== myUid).map(e => e.tvmaze_id))
  const juntosIds = new Set([...myIds].filter(id => partnerIds.has(id)))

  const filtered = entries.filter(e => {
    if (e.added_by !== myUid) return false
    if (activeFilter === "all") return true
    if (activeFilter === "juntos") return juntosIds.has(e.tvmaze_id)
    return e.status === activeFilter
  })

  const grouped: Record<string, CoupleEntry[]> = {}
  STATUS_ORDER.forEach(s => {
    const items = filtered.filter(e => e.status === s)
    if (items.length) grouped[s] = items
  })

  // ── Views ─────────────────────────────────────────────────────────────────────

  if (loading) return <PhoneLoader />

  // ── SEARCH VIEW ──────────────────────────────────────────────────────────────

  if (view === "search") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <style>{SERIES_CSS}</style>

        {/* Header */}
        <div style={{
          padding: "0.875rem 1rem 0.625rem",
          background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)",
        }}>
          <button
            onClick={() => { setView("list"); setSearchQ(""); setSearchResults([]) }}
            style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.625rem", fontFamily: "inherit" }}
          >
            <ChevronLeft size={16} /> Mi lista
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.12)", borderRadius: "12px", padding: "0.5rem 0.75rem", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Search size={15} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
            <input
              autoFocus
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Buscar serie o película..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "0.875rem", color: "white", fontFamily: "inherit" }}
            />
            {searchQ && (
              <button onClick={() => setSearchQ("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "rgba(255,255,255,0.5)", display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.25rem 0", background: "#0f0f1a" }}>
          {searching && (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", padding: "1.5rem" }}>Buscando...</p>
          )}
          {!searching && searchQ && searchResults.length === 0 && (
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem", padding: "1.5rem" }}>Sin resultados para &quot;{searchQ}&quot;</p>
          )}
          {!searching && !searchQ && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <p style={{ fontSize: "2.5rem", margin: "0 0 0.5rem" }}>🎬</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8125rem" }}>Escribe para buscar series y películas</p>
            </div>
          )}
          {searchResults.map((show, i) => {
            const alreadyMine = entries.some(e => e.tvmaze_id === show.id && e.added_by === myUid)
            return (
              <div
                key={show.id}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  animation: `searchResultIn 0.25s ease both`,
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                {show.image?.medium ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={show.image.medium} alt={show.name} style={{ width: 44, height: 62, objectFit: "cover", borderRadius: "8px", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
                ) : (
                  <div style={{ width: 44, height: 62, borderRadius: "8px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1.375rem" }}>📺</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{show.name}</p>
                  <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)", margin: "0.125rem 0 0" }}>
                    {show.network?.name ?? show.webChannel?.name ?? ""}
                    {show.genres?.length ? ` · ${show.genres.slice(0, 2).join(", ")}` : ""}
                  </p>
                  {show.summary && (
                    <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.3)", margin: "0.25rem 0 0", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                      {stripHtml(show.summary)}
                    </p>
                  )}
                </div>
                <button
                  disabled={alreadyMine || adding === show.id}
                  onClick={() => handleAdd(show)}
                  style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: "50%", border: "none",
                    cursor: alreadyMine ? "default" : "pointer",
                    background: alreadyMine ? "rgba(255,255,255,0.1)" : "#7c3aed",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: alreadyMine ? "0.875rem" : "1rem",
                    boxShadow: alreadyMine ? "none" : "0 2px 8px rgba(124,58,237,0.4)",
                  }}
                >
                  {alreadyMine ? "✓" : adding === show.id ? "…" : <Plus size={16} />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────────

  if (view === "detail" && selected) {
    const meta = STATUS_META[selected.status]
    const isOwn = selected.added_by === myUid

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <style>{SERIES_CSS}</style>

        {/* Cover */}
        <div style={{ position: "relative", height: 175, flexShrink: 0, overflow: "hidden" }}>
          {selected.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.image_url} alt={selected.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e1b4b, #4c1d95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>📺</div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%)" }} />
          <button onClick={() => { setView("list"); setSelected(null) }} style={{ position: "absolute", top: "0.625rem", left: "0.625rem", background: "rgba(0,0,0,0.45)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <ChevronLeft size={18} />
          </button>
          {/* Status badge */}
          <span style={{ position: "absolute", top: "0.625rem", right: "0.75rem", fontSize: "0.625rem", fontWeight: 700, background: meta.color, color: "white", borderRadius: "999px", padding: "3px 8px" }}>
            {meta.emoji} {meta.label}
          </span>
          <p style={{ position: "absolute", bottom: "0.75rem", left: "0.875rem", right: "0.875rem", fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.2 }}>
            {selected.title}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0.875rem 1rem", background: "#0f0f1a" }}>
          {/* Status chips */}
          {isOwn && (
            <>
              <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Estado</p>
              <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                {(Object.entries(STATUS_META) as [SeriesStatus, typeof STATUS_META[SeriesStatus]][]).map(([s, m]) => (
                  <button
                    key={s}
                    disabled={saving}
                    onClick={() => handlePatch(selected.id, { status: s })}
                    style={{
                      padding: "0.3rem 0.75rem", borderRadius: "999px",
                      border: `1.5px solid ${selected.status === s ? m.color : "rgba(255,255,255,0.1)"}`,
                      background: selected.status === s ? `${m.color}25` : "transparent",
                      color: selected.status === s ? m.color : "rgba(255,255,255,0.4)",
                      fontWeight: 600, fontSize: "0.6875rem", cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>

              {/* Progress */}
              {(selected.status === "watching" || selected.status === "paused") && (
                <>
                  <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Progreso</p>
                  <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                    {(["current_season", "current_episode"] as const).map(field => {
                      const label = field === "current_season" ? "Temporada" : "Episodio"
                      const val = selected[field]
                      return (
                        <div key={field} style={{ flex: 1 }}>
                          <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, margin: "0 0 0.25rem" }}>{label}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                            <button
                              disabled={saving || val <= (field === "current_season" ? 1 : 0)}
                              onClick={() => handlePatch(selected.id, { [field]: val - 1 })}
                              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
                            >
                              <ChevronDown size={14} />
                            </button>
                            <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "white", minWidth: 28, textAlign: "center" }}>{val}</span>
                            <button
                              disabled={saving}
                              onClick={() => handlePatch(selected.id, { [field]: val + 1 })}
                              style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "8px", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.6)" }}
                            >
                              <ChevronUp size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(selected.id)}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1.5px solid rgba(248,113,113,0.2)", borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "inherit" }}
              >
                <Trash2 size={14} /> Eliminar de mi lista
              </button>
            </>
          )}

          {!isOwn && (
            <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)" }}>
              Esta serie está en la lista de tu pareja — {STATUS_META[selected.status].emoji} {STATUS_META[selected.status].label}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── LIST VIEW (default) ───────────────────────────────────────────────────────

  const filterTabs: { key: SeriesStatus | "all" | "juntos"; label: string; emoji: string }[] = [
    { key: "all", label: "Todo", emoji: "📋" },
    ...(juntosIds.size > 0 ? [{ key: "juntos" as const, label: "Juntos", emoji: "💕" }] : []),
    { key: "watching",  label: "Viendo",    emoji: "👀" },
    { key: "wishlist",  label: "Quiero ver", emoji: "🔖" },
    { key: "completed", label: "Terminadas", emoji: "✅" },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <style>{SERIES_CSS}</style>

      {/* Header */}
      <div style={{
        padding: "0.875rem 1rem 0",
        background: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 100%)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem" }}>
          <div>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "0.8125rem", marginBottom: "0.125rem", fontFamily: "inherit", padding: 0 }}>
              <ChevronLeft size={16} /> Inicio
            </button>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "white", margin: 0 }}>
              🎬 Peliculero
            </h2>
          </div>
          <button
            onClick={() => setView("search")}
            style={{ background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "0.5rem 0.875rem", color: "white", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.375rem", fontFamily: "inherit", backdropFilter: "blur(4px)" }}
          >
            <Plus size={14} /> Añadir
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", paddingBottom: "0.625rem" }}>
          {filterTabs.map(tab => {
            const active = activeFilter === tab.key
            const meta = STATUS_META[tab.key as SeriesStatus]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  flexShrink: 0, padding: "0.3rem 0.75rem", borderRadius: "999px",
                  border: `1.5px solid ${active ? (meta?.color ?? "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.15)"}`,
                  background: active ? (meta ? `${meta.color}30` : "rgba(255,255,255,0.15)") : "transparent",
                  color: active ? (meta?.color ?? "white") : "rgba(255,255,255,0.5)",
                  fontWeight: 600, fontSize: "0.6875rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {tab.emoji} {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#0f0f1a" }}>
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.5rem", padding: "1.5rem" }}>
            <span style={{ fontSize: "2.5rem" }}>{activeFilter === "juntos" ? "💕" : "🎬"}</span>
            <p style={{ fontWeight: 700, color: "white", fontSize: "0.9375rem", margin: 0, textAlign: "center" }}>
              {activeFilter === "juntos" ? "Nada en común aún" : "Tu lista está vacía"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", margin: 0, textAlign: "center" }}>
              {activeFilter === "juntos"
                ? "Cuando los dos añadáis la misma serie, aparecerá aquí"
                : "Pulsa \"Añadir\" para buscar series y películas"}
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([status, items]) => {
            const meta = STATUS_META[status as SeriesStatus]
            return (
              <div key={status}>
                {/* Section header */}
                <div style={{ padding: "0.75rem 1rem 0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem" }}>{meta.emoji}</span>
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{meta.label}</span>
                  <span style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", borderRadius: "999px", padding: "0 5px" }}>({items.length})</span>
                </div>
                {items.map((entry, i) => {
                  const isJuntos = juntosIds.has(entry.tvmaze_id)
                  return (
                    <button
                      key={entry.id}
                      onClick={() => { setSelected(entry); setView("detail") }}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.625rem 1rem", border: "none",
                        background: "transparent",
                        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        borderLeft: `3px solid ${meta.color}`,
                        animation: `seriesCardIn 0.25s ease both`,
                        animationDelay: `${i * 0.04}s`,
                        transition: "background 0.12s",
                      }}
                    >
                      {entry.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.image_url} alt={entry.title} style={{ width: 40, height: 56, objectFit: "cover", borderRadius: "8px", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }} />
                      ) : (
                        <div style={{ width: 40, height: 56, borderRadius: "8px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1rem" }}>📺</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.title}
                          {isJuntos && <span style={{ marginLeft: "0.375rem", fontSize: "0.6875rem" }}>💕</span>}
                        </p>
                        {(entry.status === "watching" || entry.status === "paused") && (
                          <p style={{ fontSize: "0.6875rem", color: meta.color, margin: "0.125rem 0 0", fontWeight: 600 }}>
                            T{entry.current_season} · Ep {entry.current_episode}
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>›</span>
                    </button>
                  )
                })}
              </div>
            )
          })
        )}

        {/* Partner list preview */}
        {entries.some(e => e.added_by !== myUid) && activeFilter === "all" && (
          <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "0.5rem" }}>
            <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              Lista de tu pareja
            </p>
            {entries.filter(e => e.added_by !== myUid).slice(0, 4).map(e => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                {e.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.image_url}
                    alt=""
                    style={{ width: 40, height: 56, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                    onError={ev => { (ev.target as HTMLImageElement).style.display = "none" }}
                  />
                ) : (
                  <span style={{ fontSize: "0.75rem" }}>{STATUS_META[e.status].emoji}</span>
                )}
                <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.5)", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
              </div>
            ))}
            {entries.filter(e => e.added_by !== myUid).length > 4 && (
              <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.25)", margin: "0.25rem 0 0" }}>
                +{entries.filter(e => e.added_by !== myUid).length - 4} más
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
