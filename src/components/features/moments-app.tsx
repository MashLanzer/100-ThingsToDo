"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, Plus, Trash2, Image } from "lucide-react"
import { getFirebaseToken } from "@/lib/firebase/client"
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

export function MomentsApp({ onBack }: { onBack: () => void }) {
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
        {/* header */}
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.625rem" }}>
            <ChevronLeft size={16} /> Inicio
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>💫 Momentos Especiales</h2>
              <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", margin: "0.125rem 0 0" }}>Los hitos de vuestra historia</p>
            </div>
            <button
              onClick={() => setView("create")}
              style={{ width: 36, height: 36, borderRadius: "50%", background: "#be185d", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <Plus size={18} color="white" />
            </button>
          </div>
        </div>

        {/* content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1rem" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--foreground-muted)", fontSize: "0.875rem" }}>Cargando...</div>
          ) : moments.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.5rem", paddingBottom: "2rem" }}>
              <span style={{ fontSize: "3rem" }}>💫</span>
              <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", margin: 0, textAlign: "center" }}>Aún no hay momentos</p>
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: 0, textAlign: "center" }}>Guarda vuestros hitos más especiales</p>
              <button onClick={() => setView("create")} style={{ marginTop: "0.5rem", padding: "0.5rem 1.25rem", borderRadius: "999px", background: "#be185d", color: "white", border: "none", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit" }}>
                Añadir el primero
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {moments.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelected(m); setView("detail") }}
                  style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem", borderRadius: "16px", background: "var(--card)", border: "1.5px solid var(--border)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", width: "100%" }}
                >
                  {m.thumb_url || m.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.thumb_url ?? m.photo_url ?? ""} alt="" style={{ width: 52, height: 52, borderRadius: "12px", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: "12px", background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
                      {m.emoji}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.emoji} {m.title}</p>
                    <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", margin: "0.125rem 0 0" }}>{formatDate(m.moment_date)}</p>
                    {m.description && <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: "0.25rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</p>}
                  </div>
                </button>
              ))}
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
        <div style={{ padding: "1rem 1rem 0.75rem", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontWeight: 600, fontSize: "0.8125rem", padding: 0, fontFamily: "inherit", marginBottom: "0.5rem" }}>
            <ChevronLeft size={16} /> Momentos
          </button>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Nuevo momento</h3>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {/* emoji selector */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Icono</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setFEmoji(e)} style={{ width: 38, height: 38, borderRadius: "10px", border: `2px solid ${fEmoji === e ? "#be185d" : "var(--border)"}`, background: fEmoji === e ? "#fdf2f8" : "var(--card)", fontSize: "1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            ))}
          </div>

          {/* title */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Título *</p>
          <input
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
            placeholder="Primera cita, Primer viaje..."
            maxLength={60}
            style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }}
          />

          {/* date */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Fecha *</p>
          <input
            type="date"
            value={fDate}
            onChange={(e) => setFDate(e.target.value)}
            style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "1rem" }}
          />

          {/* description */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Descripción</p>
          <textarea
            value={fDesc}
            onChange={(e) => setFDesc(e.target.value)}
            placeholder="¿Qué pasó ese día?"
            maxLength={300}
            rows={3}
            style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "12px", border: "1.5px solid var(--border)", background: "var(--card)", color: "var(--foreground)", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: "0.25rem" }}
          />
          <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", textAlign: "right", marginBottom: "1rem" }}>{fDesc.length}/300</p>

          {/* photo */}
          <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--foreground-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.375rem" }}>Foto</p>
          {fPhoto ? (
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fThumb ?? fPhoto} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "12px" }} />
              <button onClick={() => { setFPhoto(null); setFThumb(null) }} style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
          ) : (
            <button onClick={openGallery} style={{ width: "100%", padding: "0.75rem", borderRadius: "12px", border: "1.5px dashed var(--border)", background: "var(--card)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "var(--foreground-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              <Image size={16} /> Elegir de la galería
            </button>
          )}

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{ width: "100%", padding: "0.75rem", borderRadius: "14px", background: "#be185d", color: "white", border: "none", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Guardando..." : "Guardar momento 💫"}
          </button>
        </div>

        {/* gallery modal */}
        {showGallery && (
          <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ background: "var(--background)", borderRadius: "20px 20px 0 0", padding: "1rem", maxHeight: "65%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", margin: 0 }}>Elige una foto</p>
                <button onClick={() => setShowGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontSize: "1.25rem" }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {galleryLoading ? (
                  <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.875rem", padding: "2rem 0" }}>Cargando fotos...</p>
                ) : galleryPhotos.length === 0 ? (
                  <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.875rem", padding: "2rem 0" }}>No hay fotos en la galería</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.25rem" }}>
                    {galleryPhotos.map((p, i) => (
                      <button
                        key={p.id ?? i}
                        onClick={() => { setFPhoto(p.image_url); setFThumb(p.thumb_url ?? p.medium_url ?? p.image_url); setShowGallery(false) }}
                        style={{ aspectRatio: "1", padding: 0, border: "none", cursor: "pointer", borderRadius: "6px", overflow: "hidden" }}
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
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* photo header */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          {selected.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.photo_url} alt="" style={{ width: "100%", height: 200, objectFit: "cover" }} />
          ) : (
            <div style={{ height: 160, background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
              {selected.emoji}
            </div>
          )}
          {selected.photo_url && (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)" }} />
          )}
          <button
            onClick={() => { setView("list"); setSelected(null) }}
            style={{ position: "absolute", top: 12, left: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ChevronLeft size={18} color="white" />
          </button>
          <button
            onClick={() => handleDelete(selected)}
            disabled={deleting}
            style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(0,0,0,0.35)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Trash2 size={16} color="white" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
            {selected.photo_url && <span style={{ fontSize: "1.75rem" }}>{selected.emoji}</span>}
            <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{selected.title}</h2>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "#be185d", fontWeight: 600, margin: "0 0 1rem" }}>📅 {formatDate(selected.moment_date)}</p>
          {selected.description && (
            <p style={{ fontSize: "0.9375rem", color: "var(--foreground)", lineHeight: 1.6, margin: 0 }}>{selected.description}</p>
          )}
        </div>
      </div>
    )
  }

  return null
}
