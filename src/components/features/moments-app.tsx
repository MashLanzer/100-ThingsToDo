"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, Plus, Trash2, Image } from "lucide-react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import { useDarkMode } from "@/hooks/use-dark-mode"

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

const EMOJIS = ["💑", "✈️", "🎄", "🏠", "💍", "🎂", "🐾", "🎓", "💼", "🏖️", "🎭", "🌙", "🎁", "🥂", "🌟", "❤️", "🎉", "🏔️", "🎬", "🍕"]

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

function timeAgo(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "hoy"
  if (diffDays === 1) return "ayer"
  if (diffDays < 30) return `hace ${diffDays} días`
  const months = Math.floor(diffDays / 30)
  if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  if (remMonths === 0) return `hace ${years} año${years > 1 ? "s" : ""}`
  return `hace ${years} año${years > 1 ? "s" : ""} y ${remMonths} mes${remMonths > 1 ? "es" : ""}`
}

const MOMENTS_CSS = `
@keyframes momentCardIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes detailIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export function MomentsApp({ onBack }: { onBack: () => void }) {
  const isDark = useDarkMode()
  const T = {
    bg:         isDark ? "#1a1225"  : "var(--background)",
    surface:    isDark ? "#221833"  : "var(--surface)",
    surfaceHov: isDark ? "#2a1e3a" : "var(--surface-hover)",
    border:     isDark ? "#4a3465" : "var(--border)",
    borderHov:  isDark ? "#5e4480" : "var(--border-hover)",
    text:       isDark ? "#f0e8ff" : "var(--foreground)",
    textSub:    isDark ? "#c4b8d8" : "var(--foreground-light)",
    textMuted:  isDark ? "#9080a8" : "var(--foreground-muted)",
    muted:      isDark ? "#2a1e3a" : "var(--muted)",
    inputBg:    isDark ? "#2e2244" : "var(--muted)",
  }

  const [view, setView] = useState<View>("list")
  const [moments, setMoments] = useState<Moment[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Moment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // form
  const [fEmoji, setFEmoji] = useState("💑")
  const [fTitle, setFTitle] = useState("")
  const [fDate, setFDate] = useState(new Date().toISOString().slice(0, 10))
  const [fDesc, setFDesc] = useState("")
  const [fPhoto, setFPhoto] = useState<string | null>(null)
  const [fThumb, setFThumb] = useState<string | null>(null)

  // gallery
  const [showGallery, setShowGallery] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)

  const loadMoments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/moments")
      if (res.ok) setMoments(await res.json())
    } finally {
      setLoading(false)
    }
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
    } finally {
      setGalleryLoading(false)
    }
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
      toast.success("Momento guardado ✨")
      setFTitle(""); setFDesc(""); setFEmoji("💑"); setFDate(new Date().toISOString().slice(0, 10)); setFPhoto(null); setFThumb(null)
      await loadMoments()
      setView("list")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(m: Moment) {
    setDeleting(true)
    try {
      const res = await authFetch(`/api/moments/${m.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Momento eliminado")
      setView("list")
      setSelected(null)
      await loadMoments()
    } catch {
      toast.error("Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  // ── LIST ──────────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <style>{MOMENTS_CSS}</style>

        {/* Header */}
        <div style={{
          padding: "1rem 1rem 0.875rem", flexShrink: 0,
          background: isDark ? "linear-gradient(135deg, #3d1e35, #4a1942)" : "linear-gradient(135deg, #fdf2f8, #fce7f3)",
          boxShadow: "0 2px 16px rgba(190,24,93,0.3)",
        }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: isDark ? "rgba(255,255,255,0.6)" : "var(--foreground)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.5rem" }}>
            <ChevronLeft size={16} /> Inicio
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: isDark ? "white" : "var(--foreground)", margin: 0 }}>💫 Momentos Especiales</h2>
              <p style={{ fontSize: "0.6875rem", color: isDark ? "rgba(255,255,255,0.6)" : "var(--foreground-muted)", margin: "0.125rem 0 0" }}>
                {moments.length > 0 ? `${moments.length} hito${moments.length !== 1 ? "s" : ""} en vuestra historia` : "Los hitos de vuestra historia"}
              </p>
            </div>
            <button
              onClick={() => setView("create")}
              style={{ width: 38, height: 38, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.2)" : "rgba(190,24,93,0.15)", border: `1.5px solid ${isDark ? "rgba(255,255,255,0.3)" : "rgba(190,24,93,0.3)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, backdropFilter: "blur(4px)" }}
            >
              <Plus size={18} color={isDark ? "white" : "var(--foreground)"} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.875rem 1rem", background: isDark ? T.bg : "#fdf2f8" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#be185d", fontSize: "0.875rem" }}>Cargando...</div>
          ) : moments.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", paddingBottom: "2rem", textAlign: "center" }}>
              <span style={{ fontSize: "4rem", lineHeight: 1 }}>💫</span>
              <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#be185d", margin: 0 }}>Aún no hay momentos</p>
              <p style={{ fontSize: "0.8125rem", color: "#9d174d", margin: 0, lineHeight: 1.5, maxWidth: "220px" }}>Guarda vuestros hitos más especiales para recordarlos siempre</p>
              <button
                onClick={() => setView("create")}
                style={{ marginTop: "0.25rem", padding: "0.625rem 1.375rem", borderRadius: "999px", background: "linear-gradient(135deg, #be185d, #ec4899)", color: "white", border: "none", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 16px rgba(190,24,93,0.35)" }}
              >
                Añadir el primero ✨
              </button>
            </div>
          ) : (
            /* Timeline list */
            <div style={{ position: "relative" }}>
              {/* Timeline line */}
              <div style={{ position: "absolute", left: "1.1875rem", top: 8, bottom: 8, width: 2, background: "linear-gradient(to bottom, #f9a8d4, #fce7f3)", borderRadius: "1px" }} />

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {moments.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelected(m); setView("detail") }}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.875rem",
                      padding: "0.75rem 0.875rem 0.75rem 2.5rem",
                      borderRadius: "16px",
                      background: T.surface,
                      border: `1.5px solid ${T.border}`,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      boxShadow: "0 2px 8px rgba(190,24,93,0.08)",
                      width: "100%",
                      position: "relative",
                      animation: `momentCardIn 0.35s ease both`,
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >
                    {/* Timeline dot */}
                    <div style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", background: "#be185d", border: `2.5px solid ${T.border}`, boxShadow: "0 0 0 2px #be185d20" }} />

                    {m.thumb_url || m.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.thumb_url ?? m.photo_url ?? ""} alt="" style={{ width: 52, height: 52, borderRadius: "12px", objectFit: "cover", flexShrink: 0, border: `1.5px solid ${T.border}` }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: "12px", background: isDark ? T.muted : "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0, border: `1.5px solid ${T.border}` }}>
                        {m.emoji}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: T.text, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.emoji} {m.title}</p>
                      <p style={{ fontSize: "0.6875rem", color: "#be185d", margin: "0.125rem 0 0", fontWeight: 600 }}>{formatDate(m.moment_date)}</p>
                      <p style={{ fontSize: "0.625rem", color: T.textMuted, margin: "0.0625rem 0 0", opacity: 0.7 }}>{timeAgo(m.moment_date)}</p>
                    </div>
                    <span style={{ color: T.textSub, flexShrink: 0, fontSize: "1rem" }}>›</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── CREATE ─────────────────────────────────────────────────────────────────

  if (view === "create") {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <style>{MOMENTS_CSS}</style>

        {/* Header */}
        <div style={{ padding: "1rem 1rem 0.875rem", flexShrink: 0, background: isDark ? "linear-gradient(135deg, #3d1e35, #4a1942)" : "linear-gradient(135deg, #fdf2f8, #fce7f3)" }}>
          <button onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: isDark ? "rgba(255,255,255,0.6)" : "var(--foreground)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.5rem" }}>
            <ChevronLeft size={16} /> Momentos
          </button>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: isDark ? "white" : "var(--foreground)", margin: 0 }}>✨ Nuevo momento</h3>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem", background: isDark ? T.bg : "#fdf2f8" }}>
          {/* Emoji selector */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Icono</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setFEmoji(e)}
                style={{
                  width: 40, height: 40, borderRadius: "12px",
                  border: `2px solid ${fEmoji === e ? "#be185d" : T.border}`,
                  background: fEmoji === e ? T.surface : "transparent",
                  fontSize: "1.375rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: fEmoji === e ? "0 2px 8px rgba(190,24,93,0.25)" : "none",
                  transition: "all 0.12s",
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Title */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Título *</p>
          <input
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
            placeholder="Primera cita, Primer viaje..."
            maxLength={60}
            style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }}
          />

          {/* Date */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Fecha *</p>
          <input
            type="date"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
            style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "0.375rem" }}
          />
          {fDate && (
            <p style={{ fontSize: "0.6875rem", color: T.textMuted, marginBottom: "1rem", fontWeight: 600 }}>
              📅 {formatDate(fDate)} · {timeAgo(fDate)}
            </p>
          )}

          {/* Description */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Descripción</p>
          <textarea
            value={fDesc}
            onChange={(e) => setFDesc(e.target.value)}
            placeholder="¿Qué pasó ese día?"
            maxLength={300}
            rows={3}
            style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: `1.5px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: "0.25rem" }}
          />
          <p style={{ fontSize: "0.625rem", color: T.textMuted, textAlign: "right", marginBottom: "1rem" }}>{fDesc.length}/300</p>

          {/* Photo */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#be185d", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Foto</p>
          {fPhoto ? (
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fThumb ?? fPhoto} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "14px", border: `1.5px solid ${T.border}` }} />
              <button onClick={() => { setFPhoto(null); setFThumb(null) }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={openGallery}
              style={{ width: "100%", padding: "0.875rem", borderRadius: "12px", border: `2px dashed ${T.border}`, background: T.surface, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#be185d", fontSize: "0.875rem", marginBottom: "1rem", fontWeight: 600 }}
            >
              <Image size={16} /> Elegir de la galería
            </button>
          )}

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{
              width: "100%", padding: "0.8125rem", borderRadius: "14px",
              background: "linear-gradient(135deg, #be185d, #ec4899)", color: "white",
              border: "none", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
              boxShadow: "0 4px 16px rgba(190,24,93,0.35)",
            }}
          >
            {saving ? "Guardando..." : "Guardar momento 💫"}
          </button>
        </div>

        {/* Gallery modal */}
        {showGallery && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ background: T.surface, borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "65%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexShrink: 0 }}>
                <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: T.text, margin: 0 }}>Elige una foto</p>
                <button onClick={() => setShowGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: "1.25rem" }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {galleryLoading ? (
                  <p style={{ textAlign: "center", color: T.textMuted, fontSize: "0.875rem", padding: "2rem 0" }}>Cargando fotos...</p>
                ) : galleryPhotos.length === 0 ? (
                  <p style={{ textAlign: "center", color: T.textMuted, fontSize: "0.875rem", padding: "2rem 0" }}>No hay fotos en la galería</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                    {galleryPhotos.map((p, i) => (
                      <button
                        key={p.id ?? i}
                        onClick={() => { setFPhoto(p.image_url); setFThumb(p.thumb_url ?? p.medium_url ?? p.image_url); setShowGallery(false) }}
                        style={{ aspectRatio: "1", padding: 0, border: "2px solid transparent", cursor: "pointer", borderRadius: "8px", overflow: "hidden" }}
                      >
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
      </div>
    )
  }

  // ── DETAIL ─────────────────────────────────────────────────────────────────

  if (view === "detail" && selected) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", animation: "slideInRight 0.3s ease" }}>
        <style>{MOMENTS_CSS}</style>

        {/* Photo header */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {selected.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.photo_url} alt="" style={{ width: "100%", height: 220, objectFit: "cover" }} />
          ) : (
            <div style={{ height: 180, background: "linear-gradient(135deg, #831843 0%, #be185d 50%, #ec4899 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
              {selected.emoji}
            </div>
          )}
          {selected.photo_url && (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(131,24,67,0.7) 0%, transparent 55%)" }} />
          )}
          <button
            onClick={() => { setView("list"); setSelected(null) }}
            style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={18} color="white" />
          </button>
          <button
            onClick={() => handleDelete(selected)}
            disabled={deleting}
            style={{ position: "absolute", top: 12, right: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Trash2 size={16} color="white" />
          </button>

          {/* Title overlay on photo */}
          {selected.photo_url && (
            <div style={{ position: "absolute", bottom: "0.875rem", left: "1rem", right: "1rem" }}>
              <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "white", margin: 0, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>
                {selected.emoji} {selected.title}
              </h2>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem", background: isDark ? T.bg : "#fdf2f8", animation: "detailIn 0.3s ease" }}>
          {!selected.photo_url && (
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: T.text, margin: "0 0 0.5rem" }}>
              {selected.title}
            </h2>
          )}

          {/* Date + relative time */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8125rem", color: "white", background: "#be185d", fontWeight: 700, borderRadius: "999px", padding: "3px 10px" }}>
              📅 {formatDate(selected.moment_date)}
            </span>
            <span style={{ fontSize: "0.75rem", color: isDark ? "#f9a8d4" : "#9d174d", fontWeight: 600 }}>
              {timeAgo(selected.moment_date)}
            </span>
          </div>

          {selected.description && (
            <p style={{ fontFamily: "Georgia, serif", fontSize: "0.9375rem", color: T.text, lineHeight: 1.65, margin: 0, background: T.surface, padding: "1rem", borderRadius: "14px", border: `1.5px solid ${T.border}` }}>
              {selected.description}
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}
