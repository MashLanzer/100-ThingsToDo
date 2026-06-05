"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, Plus, Trash2, Image, Share2, ArrowUpDown } from "lucide-react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

interface Moment {
  id: string
  couple_id: string
  title: string
  emoji: string
  moment_date: string
  description: string | null
  photo_url: string | null
  thumb_url: string | null
  added_by: string
  created_at: string
}

interface GalleryPhoto {
  id?: string
  image_url: string
  thumb_url?: string
  medium_url?: string
  caption?: string
}

type View = "list" | "create" | "detail"

const EMOJIS = [
  "💑", "✈️", "🎄", "🏠", "💍", "🎂", "🐾", "🎓",
  "💼", "🏖️", "🎭", "🌙", "🎁", "🥂", "🌟", "❤️",
  "🎉", "🏔️", "🎬", "🍕", "🌹", "🎵", "🌊", "🚂",
  "🎨", "🤝", "🎯", "🌺", "🦋", "🏡",
]

const SPECIAL_DATES: Record<string, string> = {
  "02-14": "💝", "12-25": "🎄", "12-31": "🎊",
  "01-01": "✨", "10-31": "🎃", "06-21": "☀️",
}

const APP_CSS = `
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
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
  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes floatHeart {
    0%   { opacity: 1; transform: translateY(0) scale(1); }
    100% { opacity: 0; transform: translateY(-100px) scale(0.3); }
  }
`

async function authFetch(url: string, opts: RequestInit = {}) {
  const token = await getFirebaseToken()
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers ?? {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const s = d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function relativeTime(dateStr: string): string {
  const then = new Date(dateStr + "T12:00:00")
  const diffMs = Date.now() - then.getTime()
  const days = Math.floor(diffMs / 86400000)
  if (days < 1) return "hoy"
  if (days < 30) return `hace ${days} ${days === 1 ? "día" : "días"}`
  const months = Math.floor(days / 30.4)
  if (months < 12) return `hace ${months} ${months === 1 ? "mes" : "meses"}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (rem === 0) return `hace ${years} ${years === 1 ? "año" : "años"}`
  return `hace ${years} ${years === 1 ? "año" : "años"} y ${rem} ${rem === 1 ? "mes" : "meses"}`
}

function getYear(dateStr: string) { return dateStr.slice(0, 4) }

function SkeletonTimeline() {
  const bar = (w: string, h: number) => ({
    height: h, width: w, borderRadius: 4,
    background: "linear-gradient(90deg,#f3e8ff 25%,#fdf4ff 50%,#f3e8ff 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s ease infinite",
  })
  return (
    <div style={{ padding: "0.75rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ display: "flex", gap: "0.75rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12, flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f3e8ff", flexShrink: 0, marginTop: 4 }} />
            <div style={{ width: 2, flex: 1, background: "#f3e8ff", minHeight: 40 }} />
          </div>
          <div style={{ flex: 1, background: "white", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden", marginBottom: "0.5rem" }}>
            <div style={{ ...bar("100%", 100), borderRadius: 0, backgroundSize: "200% 100%" }} />
            <div style={{ padding: "0.5rem 0.625rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <div style={bar("65%", 13)} />
              <div style={bar("40%", 10)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MomentsApp({ onBack }: { onBack: () => void }) {
  const { user } = useAuth()
  const myUid = user?.uid ?? ""

  const [view, setView] = useState<View>("list")
  const [prevView, setPrevView] = useState<View | null>(null)
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Moment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveAnim, setSaveAnim] = useState(false)

  const [sortAsc, setSortAsc] = useState(false)
  const [yearFilter, setYearFilter] = useState<string | null>(null)

  const [fEmoji, setFEmoji] = useState("💑")
  const [fTitle, setFTitle] = useState("")
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10))
  const [fDesc, setFDesc] = useState("")
  const [fPhoto, setFPhoto] = useState<string | null>(null)
  const [fThumb, setFThumb] = useState<string | null>(null)

  const [showGallery, setShowGallery] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)

  const loadMoments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/moments")
      if (res.ok) setMoments(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadMoments() }, [loadMoments])

  async function openGallery() {
    setShowGallery(true)
    if (galleryPhotos.length > 0) return
    setGalleryLoading(true)
    try {
      const res = await authFetch("/api/photos?limit=60")
      if (res.ok) {
        const data = await res.json()
        setGalleryPhotos(Array.isArray(data) ? data : (data.photos ?? []))
      }
    } finally { setGalleryLoading(false) }
  }

  async function handleCreate() {
    if (!fTitle.trim()) { toast.error("Añade un título"); return }
    setSaving(true)
    try {
      const res = await authFetch("/api/moments", {
        method: "POST",
        body: JSON.stringify({ title: fTitle, emoji: fEmoji, moment_date: fDate, description: fDesc, photo_url: fPhoto, thumb_url: fThumb }),
      })
      if (!res.ok) throw new Error()
      setSaveAnim(true)
      setTimeout(() => {
        setSaveAnim(false)
        setFTitle(""); setFDesc(""); setFEmoji("💑")
        setFDate(new Date().toISOString().slice(0, 10))
        setFPhoto(null); setFThumb(null)
        loadMoments()
        setPrevView("create"); setView("list")
      }, 1100)
    } catch {
      toast.error("Error al guardar")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selected) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/moments/${selected.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Momento eliminado")
      setPrevView("detail"); setView("list")
      setSelected(null); setDeleteConfirm(false)
      await loadMoments()
    } catch {
      toast.error("Error al eliminar")
    } finally { setDeleting(false) }
  }

  function handleShare() {
    if (!selected) return
    const rel = relativeTime(selected.moment_date)
    const msg = `${selected.emoji} ${selected.title} — ${rel} 💫\n${selected.description ?? ""}`
    if (navigator.share) { navigator.share({ text: msg.trim() }).catch(() => {}) }
    else { navigator.clipboard.writeText(msg.trim()).then(() => toast.success("Copiado al portapapeles")) }
  }

  // Derived
  const sorted = [...moments].sort((a, b) => {
    const cmp = a.moment_date.localeCompare(b.moment_date)
    return sortAsc ? cmp : -cmp
  })
  const years = [...new Set(moments.map(m => getYear(m.moment_date)))].sort((a, b) => b.localeCompare(a))
  const displayed = yearFilter ? sorted.filter(m => getYear(m.moment_date) === yearFilter) : sorted
  const firstYear = years[years.length - 1]

  // ── LIST ──────────────────────────────────────────────────────────────────────

  if (view === "list") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: prevView === "detail" || prevView === "create" ? "slideInLeft 0.22s ease both" : undefined }}>
      <style>{APP_CSS}</style>

      {/* #1 Romantic header */}
      <div style={{ background: "linear-gradient(135deg, #9d174d 0%, #be185d 50%, #a21caf 100%)", flexShrink: 0, padding: "0.75rem 1rem 0.875rem" }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "999px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: "0.75rem", marginBottom: "0.5rem", fontFamily: "inherit", padding: "0.2rem 0.625rem 0.2rem 0.375rem" }}>
          <ChevronLeft size={14} /> Inicio
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.1 }}>💫 Momentos</h2>
            {/* #2 counter */}
            <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.65)", margin: "0.25rem 0 0", fontWeight: 500 }}>
              {moments.length > 0
                ? `${moments.length} momentos juntos${firstYear ? ` · desde ${firstYear}` : ""}`
                : "Los hitos de vuestra historia"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.375rem", paddingTop: "0.25rem" }}>
            {/* #9 sort toggle */}
            <button onClick={() => setSortAsc(v => !v)}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "8px", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.85)" }}>
              <ArrowUpDown size={14} />
            </button>
            <button onClick={() => { setPrevView("list"); setView("create") }}
              style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={18} color="white" />
            </button>
          </div>
        </div>

        {/* #6 Year filter chips */}
        {years.length > 1 && (
          <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", paddingTop: "0.625rem" }}>
            <button onClick={() => setYearFilter(null)}
              style={{ flexShrink: 0, padding: "0.25rem 0.625rem", borderRadius: "999px", border: `1.5px solid ${yearFilter === null ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)"}`, background: yearFilter === null ? "rgba(255,255,255,0.2)" : "transparent", color: yearFilter === null ? "white" : "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: "0.6875rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              Todos
            </button>
            {years.map(y => (
              <button key={y} onClick={() => setYearFilter(yearFilter === y ? null : y)}
                style={{ flexShrink: 0, padding: "0.25rem 0.625rem", borderRadius: "999px", border: `1.5px solid ${yearFilter === y ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.25)"}`, background: yearFilter === y ? "rgba(255,255,255,0.2)" : "transparent", color: yearFilter === y ? "white" : "rgba(255,255,255,0.65)", fontWeight: 600, fontSize: "0.6875rem", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {y}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", background: "#fdf4ff" }}>
        {loading ? <SkeletonTimeline /> : displayed.length === 0 ? (
          /* #8 improved empty state */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80%", gap: "0.75rem", padding: "1.5rem", animation: "fadeSlideIn 0.4s ease both" }}>
            <span style={{ fontSize: "4rem" }}>📸</span>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#9d174d", margin: 0, textAlign: "center" }}>
              {yearFilter ? `No hay momentos de ${yearFilter}` : "Aún no hay momentos"}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#be185d", margin: 0, textAlign: "center", lineHeight: 1.5, maxWidth: 220, opacity: 0.8 }}>
              Guarda los hitos más especiales de vuestra historia juntos
            </p>
            {!yearFilter && (
              <button onClick={() => { setPrevView("list"); setView("create") }}
                style={{ marginTop: "0.5rem", background: "#be185d", color: "white", border: "none", borderRadius: "999px", padding: "0.625rem 1.5rem", fontWeight: 700, fontSize: "0.875rem", fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 12px rgba(190,24,93,0.35)" }}>
                + Añadir el primero
              </button>
            )}
          </div>
        ) : (
          /* #4 Timeline vertical + #3 Polaroid cards */
          <div style={{ padding: "0.875rem 1rem 2rem" }}>
            {(() => {
              const items: React.ReactNode[] = []
              let lastYear = ""
              displayed.forEach((m, idx) => {
                const year = getYear(m.moment_date)
                const isLast = idx === displayed.length - 1
                if (year !== lastYear) {
                  lastYear = year
                  items.push(
                    <div key={`year-${year}`} style={{ display: "flex", alignItems: "center", gap: "0.625rem", margin: "0.75rem 0 0.625rem" }}>
                      <div style={{ flex: 1, height: 1, background: "#f9a8d4" }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#be185d", background: "#fdf2f8", padding: "0.2rem 0.625rem", borderRadius: "999px", border: "1.5px solid #f9a8d4" }}>{year}</span>
                      <div style={{ flex: 1, height: 1, background: "#f9a8d4" }} />
                    </div>
                  )
                }
                const isOwn = m.added_by === myUid
                const mmdd = m.moment_date.slice(5)
                const specialEmoji = SPECIAL_DATES[mmdd]
                items.push(
                  <div key={m.id} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                    {/* Timeline dot + line */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14, flexShrink: 0, paddingTop: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#be185d", flexShrink: 0, boxShadow: "0 0 0 3px #fce7f3" }} />
                      {!isLast && <div style={{ width: 2, flex: 1, background: "#f9a8d4", minHeight: 32, marginTop: 2 }} />}
                    </div>
                    {/* #3/#5 Polaroid card */}
                    <button onClick={() => { setSelected(m); setPrevView("list"); setView("detail") }}
                      style={{ flex: 1, background: "white", borderRadius: "6px", boxShadow: "0 4px 14px rgba(190,24,93,0.1), 0 1px 4px rgba(0,0,0,0.06)", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit", marginBottom: "0.75rem", overflow: "hidden", padding: 0 }}>
                      {/* Photo or emoji */}
                      {m.thumb_url || m.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.thumb_url ?? m.photo_url ?? ""} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                      ) : (
                        <div style={{ height: 100, background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
                          {m.emoji}
                        </div>
                      )}
                      {/* Polaroid caption */}
                      <div style={{ padding: "0.5rem 0.625rem 0.625rem", background: "white" }}>
                        <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: "#9d174d", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.thumb_url || m.photo_url ? `${m.emoji} ` : ""}{m.title}{specialEmoji ? ` ${specialEmoji}` : ""}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.2rem" }}>
                          <p style={{ fontSize: "0.625rem", color: "#be185d", margin: 0, fontWeight: 500 }}>{formatDate(m.moment_date)}</p>
                          {/* #10 added by badge */}
                          <span style={{ fontSize: "0.5rem", color: isOwn ? "#be185d" : "#a21caf", background: isOwn ? "#fdf2f8" : "#faf5ff", borderRadius: "999px", padding: "1px 5px", fontWeight: 700 }}>
                            {isOwn ? "Tú" : "Pareja"}
                          </span>
                        </div>
                        {m.description && (
                          <p style={{ fontSize: "0.6875rem", color: "#9d174d", margin: "0.25rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.8 }}>{m.description}</p>
                        )}
                      </div>
                    </button>
                  </div>
                )
              })
              return items
            })()}
          </div>
        )}
      </div>

      {/* FAB */}
      {!loading && (
        <button onClick={() => { setPrevView("list"); setView("create") }}
          style={{ position: "absolute", bottom: "1rem", right: "1rem", width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #be185d, #a21caf)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(190,24,93,0.45)", zIndex: 10 }}>
          <Plus size={22} />
        </button>
      )}
    </div>
  )

  // ── CREATE ────────────────────────────────────────────────────────────────────

  if (view === "create") return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative" }}>
      <style>{APP_CSS}</style>

      {/* #11 Dark romantic header */}
      <div style={{ background: "linear-gradient(135deg, #9d174d 0%, #be185d 50%, #a21caf 100%)", padding: "0.75rem 1rem 0.875rem", flexShrink: 0 }}>
        <button onClick={() => { setPrevView("create"); setView("list") }}
          style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "999px", cursor: "pointer", color: "rgba(255,255,255,0.8)", fontWeight: 600, fontSize: "0.75rem", marginBottom: "0.5rem", fontFamily: "inherit", padding: "0.2rem 0.625rem 0.2rem 0.375rem" }}>
          <ChevronLeft size={14} /> Momentos
        </button>
        <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "white", margin: 0 }}>Nuevo momento ✨</h3>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem", background: "#fdf4ff" }}>
        {/* #12 Emoji selector improved */}
        <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Icono</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.375rem", marginBottom: "1.25rem" }}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setFEmoji(e)}
              style={{ height: 42, borderRadius: "10px", border: `2px solid ${fEmoji === e ? "#be185d" : "var(--border)"}`, background: fEmoji === e ? "#fdf2f8" : "white", fontSize: "1.375rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: fEmoji === e ? "0 2px 8px rgba(190,24,93,0.2)" : "none", transition: "all 0.12s", position: "relative" }}>
              {e}
              {fEmoji === e && <span style={{ position: "absolute", top: -4, right: -4, width: 12, height: 12, borderRadius: "50%", background: "#be185d", fontSize: "0.4rem", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>}
            </button>
          ))}
        </div>

        {/* title */}
        <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Título *</p>
        <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="Primera cita, Primer viaje..." maxLength={60}
          style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid #fce7f3", background: "white", color: "var(--foreground)", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }} />

        {/* date */}
        <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Fecha *</p>
        <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
          style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid #fce7f3", background: "white", color: "var(--foreground)", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "0.375rem" }} />
        {/* #14 formatted date preview */}
        {fDate && (
          <p style={{ fontSize: "0.6875rem", color: "#be185d", marginBottom: "1rem", fontWeight: 500 }}>
            {SPECIAL_DATES[fDate.slice(5)] ?? "📅"} {formatDateLong(fDate)}
          </p>
        )}

        {/* description */}
        <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Descripción</p>
        <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value)} placeholder="¿Qué pasó ese día?" maxLength={300} rows={3}
          style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid #fce7f3", background: "white", color: "var(--foreground)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: "0.25rem" }} />
        <p style={{ fontSize: "0.625rem", color: "#be185d", textAlign: "right", marginBottom: "1rem", opacity: 0.7 }}>{fDesc.length}/300</p>

        {/* photo */}
        <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Foto</p>
        {fPhoto ? (
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fThumb ?? fPhoto} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "12px" }} />
            <button onClick={() => { setFPhoto(null); setFThumb(null) }}
              style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        ) : (
          <button onClick={openGallery}
            style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", border: "1.5px dashed #f9a8d4", background: "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#be185d", fontSize: "0.875rem", marginBottom: "1rem", fontWeight: 600 }}>
            <Image size={16} /> Elegir de la galería
          </button>
        )}

        {/* #13 Live preview */}
        {fTitle.trim() && (
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontSize: "0.625rem", fontWeight: 700, color: "#9d174d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Vista previa</p>
            <div style={{ background: "white", borderRadius: "6px", boxShadow: "0 4px 14px rgba(190,24,93,0.1)", overflow: "hidden", maxWidth: 200, margin: "0 auto" }}>
              {fPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fThumb ?? fPhoto} alt="" style={{ width: "100%", height: 100, objectFit: "cover" }} />
              ) : (
                <div style={{ height: 80, background: "linear-gradient(135deg, #fdf2f8, #fce7f3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.25rem" }}>{fEmoji}</div>
              )}
              <div style={{ padding: "0.375rem 0.5rem 0.5rem" }}>
                <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.8125rem", fontWeight: 700, color: "#9d174d", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fEmoji} {fTitle}</p>
                <p style={{ fontSize: "0.5625rem", color: "#be185d", margin: "0.1rem 0 0", fontWeight: 500 }}>{fDate ? formatDate(fDate) : ""}</p>
              </div>
            </div>
          </div>
        )}

        <button onClick={handleCreate} disabled={saving}
          style={{ width: "100%", padding: "0.75rem", borderRadius: "14px", background: saving ? "#f9a8d4" : "linear-gradient(135deg, #be185d, #a21caf)", color: "white", border: "none", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", cursor: saving ? "default" : "pointer", boxShadow: "0 4px 12px rgba(190,24,93,0.35)" }}>
          {saving ? "Guardando..." : "Guardar momento 💫"}
        </button>
      </div>

      {/* #16 Gallery modal improved */}
      {showGallery && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ background: "var(--background)", borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "70%", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexShrink: 0 }}>
              <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--foreground)", margin: 0 }}>Elige una foto</p>
              <button onClick={() => setShowGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontSize: "1.25rem" }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {galleryLoading ? (
                <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.875rem", padding: "2rem 0" }}>Cargando fotos...</p>
              ) : galleryPhotos.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.875rem", padding: "2rem 0" }}>No hay fotos en la galería</p>
              ) : (
                /* #16 2-column grid for bigger photos */
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.375rem" }}>
                  {galleryPhotos.map((p, i) => (
                    <button key={p.id ?? i}
                      onClick={() => { setFPhoto(p.image_url); setFThumb(p.thumb_url ?? p.medium_url ?? p.image_url); setShowGallery(false) }}
                      style={{ aspectRatio: "1", padding: 0, border: "none", cursor: "pointer", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumb_url ?? p.medium_url ?? p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* #15 Floating hearts animation */}
      {saveAnim && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {["❤️", "💕", "💫", "✨", "🌸"].map((e, i) => (
              <span key={i} style={{ position: "absolute", left: `${15 + i * 17}%`, bottom: "35%", fontSize: `${1.2 + (i % 2) * 0.5}rem`, animation: "floatHeart 1.1s ease both", animationDelay: `${i * 0.12}s` }}>{e}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── DETAIL ────────────────────────────────────────────────────────────────────

  if (view === "detail" && selected) {
    const mmdd = selected.moment_date.slice(5)
    const specialEmoji = SPECIAL_DATES[mmdd]
    const isOwn = selected.added_by === myUid

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: "slideInRight 0.22s ease both" }}>
        <style>{APP_CSS}</style>

        {/* #17 Full blur cover — 260px */}
        <div style={{ position: "relative", height: 260, flexShrink: 0, overflow: "hidden", background: "#9d174d" }}>
          {selected.photo_url ? (
            <>
              {/* blurred background */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.photo_url} alt="" style={{ position: "absolute", inset: -20, width: "calc(100% + 40px)", height: "calc(100% + 40px)", objectFit: "cover", filter: "blur(18px)", transform: "scale(1.1)", opacity: 0.7 }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)" }} />
            </>
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #9d174d 0%, #be185d 50%, #a21caf 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "5rem", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>{selected.emoji}</span>
            </div>
          )}

          <button onClick={() => { setPrevView("detail"); setView("list"); setSelected(null); setDeleteConfirm(false) }}
            style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={18} color="white" />
          </button>

          {/* Title overlay on photo */}
          {selected.photo_url && (
            <div style={{ position: "absolute", bottom: "0.875rem", left: "0.875rem", right: "0.875rem" }}>
              <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                {selected.emoji} {selected.title}{specialEmoji ? ` ${specialEmoji}` : ""}
              </p>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem", background: "#fdf4ff" }}>
          {/* Title (when no photo) */}
          {!selected.photo_url && (
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "#9d174d", margin: "0 0 0.5rem" }}>
              {selected.title}{specialEmoji ? ` ${specialEmoji}` : ""}
            </h2>
          )}

          {/* #18 Stylized date + relative */}
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "#be185d", margin: 0 }}>
              📅 {formatDate(selected.moment_date)}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#a21caf", margin: "0.125rem 0 0", fontWeight: 500, fontStyle: "italic" }}>
              {relativeTime(selected.moment_date)}
            </p>
          </div>

          {/* #19 Diary-style description */}
          {selected.description && (
            <div style={{ background: "#fffbeb", borderRadius: "12px", padding: "1rem", border: "1px solid #fde68a", marginBottom: "1.25rem", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)" }}>
              <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "0.9375rem", color: "#78350f", lineHeight: 1.7, margin: 0, fontStyle: "italic" }}>
                &ldquo;{selected.description}&rdquo;
              </p>
            </div>
          )}

          {/* #22 Added by */}
          <p style={{ fontSize: "0.625rem", color: "#be185d", fontWeight: 600, marginBottom: "1rem", opacity: 0.7 }}>
            Añadido por {isOwn ? "ti" : "tu pareja"} · {formatDate(selected.created_at.slice(0, 10))}
          </p>

          {/* #20 Share button */}
          <button onClick={handleShare}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: "#fdf2f8", border: "1.5px solid #f9a8d4", borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", color: "#be185d", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "inherit", marginBottom: "1rem" }}>
            <Share2 size={14} /> Compartir este momento
          </button>

          {/* Delete with confirmation */}
          <div style={{ borderTop: "1px solid #fce7f3", paddingTop: "1rem" }}>
            {deleteConfirm ? (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem", color: "white", background: "#dc2626", border: "none", borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                  <Trash2 size={13} /> {deleting ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button onClick={() => setDeleteConfirm(false)}
                  style={{ padding: "0.5rem 0.875rem", borderRadius: "10px", border: "1.5px solid #fce7f3", background: "transparent", color: "var(--foreground-muted)", cursor: "pointer", fontWeight: 600, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--foreground-muted)", background: "none", border: "1.5px solid var(--border)", borderRadius: "10px", padding: "0.5rem 0.875rem", cursor: "pointer", fontWeight: 500, fontSize: "0.8125rem", fontFamily: "inherit" }}>
                <Trash2 size={13} /> Eliminar momento
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
