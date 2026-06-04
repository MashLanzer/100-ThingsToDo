"use client"

import { useState, useEffect, useRef } from "react"
import { useAppStore } from "@/stores/app-store"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Place } from "@/types"
import { X, Plus, Trash2, Search, MapPin, Share2 } from "lucide-react"

type PlaceStatus = "visited" | "wishlist"

const STATUS_OPTIONS: { id: PlaceStatus; label: string; emoji: string }[] = [
  { id: "visited",  label: "Visitado",    emoji: "📍" },
  { id: "wishlist", label: "Lista deseos", emoji: "⭐" },
]

function relDays(dateStr: string | null): string {
  if (!dateStr) return "—"
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diff === 0) return "hoy"
  if (diff === 1) return "ayer"
  if (diff < 30) return `hace ${diff}d`
  return new Date(dateStr).toLocaleDateString("es-ES", { month: "short", year: "numeric" })
}

export function MapModal() {
  const { showMapModal, closeMapModal } = useAppStore()
  const coupleName = useAppStore((s) => s.coupleName)
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "add">("list")
  const [tab, setTab] = useState<"all" | "visited" | "wishlist">("all")
  const [saving, setSaving] = useState(false)
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [editName, setEditName] = useState("")
  const [editStatus, setEditStatus] = useState<PlaceStatus>("wishlist")
  const [editNote, setEditNote] = useState("")
  const globeRef = useRef<HTMLDivElement>(null)
  const globeInstanceRef = useRef<unknown>(null)
  const leafletMapRef = useRef<HTMLDivElement>(null)
  const leafletInstanceRef = useRef<unknown>(null)
  const markerRef = useRef<unknown>(null)

  // Form state
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [status, setStatus] = useState<PlaceStatus>("wishlist")
  const [note, setNote] = useState("")
  const [date, setDate] = useState("")
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photoInput, setPhotoInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)

  // Edit state
  const [editDate, setEditDate] = useState("")
  const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([])
  const [editPhotoInput, setEditPhotoInput] = useState("")

  // List filter state
  const [listFilter, setListFilter] = useState("")

  // Gallery picker state
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<{ id: string; image_url: string; thumb_url: string | null }[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  // "add" = picker for add form, "edit" = picker for edit form
  const [galleryTarget, setGalleryTarget] = useState<"add" | "edit">("add")

  useEffect(() => {
    if (showMapModal) {
      loadPlaces()
    } else {
      globeInstanceRef.current = null
      cleanupLeaflet()
    }
  }, [showMapModal])

  useEffect(() => {
    if (showMapModal && view === "list" && places.length > 0 && globeRef.current) {
      initGlobe()
    }
  }, [showMapModal, view, places])

  useEffect(() => {
    if (showMapModal && view === "add") {
      // small delay to let the DOM mount
      const t = setTimeout(() => initLeaflet(), 150)
      return () => clearTimeout(t)
    } else {
      cleanupLeaflet()
    }
  }, [showMapModal, view])

  function cleanupLeaflet() {
    if (leafletInstanceRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(leafletInstanceRef.current as any).remove()
      leafletInstanceRef.current = null
      markerRef.current = null
    }
  }

  async function authFetch(path: string, init?: RequestInit) {
    const token = await getFirebaseToken()
    if (!token) throw new Error("Not authenticated")
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error("Request failed")
    return res.json()
  }

  async function loadPlaces() {
    setLoading(true)
    try {
      const data = await authFetch("/api/places")
      setPlaces(data)
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function initGlobe() {
    if (globeInstanceRef.current || !globeRef.current) return
    try {
      const GlobeModule = await import("globe.gl" as never) as { default: unknown }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const GlobeGL = GlobeModule.default as (el: HTMLElement) => any
      if (!globeRef.current) return
      const globe = GlobeGL(globeRef.current)
      globe.width(globeRef.current.offsetWidth || 380)
      globe.height(240)
      globe.backgroundColor("rgba(0,0,0,0)")
      globe.globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
      const pointData = places.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name, status: p.status }))
      globe.pointsData(pointData)
        .pointLat((d: unknown) => (d as { lat: number }).lat)
        .pointLng((d: unknown) => (d as { lng: number }).lng)
        .pointColor((d: unknown) => (d as { status: string }).status === "visited" ? "#EC4899" : "#8B5CF6")
        .pointAltitude(0.02).pointRadius(0.5)
        .pointLabel((d: unknown) => (d as { name: string }).name)
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.5
      globeInstanceRef.current = globe
    } catch { /* fallback */ }
  }

  async function initLeaflet() {
    if (leafletInstanceRef.current || !leafletMapRef.current) return
    try {
      const L = (await import("leaflet")).default
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(leafletMapRef.current!).setView([20, 0], 2)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map)

      let marker: ReturnType<typeof L.marker> | null = null

      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: clickLat, lng: clickLng } = e.latlng
        setLat(parseFloat(clickLat.toFixed(6)))
        setLng(parseFloat(clickLng.toFixed(6)))
        if (marker) marker.setLatLng([clickLat, clickLng])
        else {
          marker = L.marker([clickLat, clickLng]).addTo(map)
          markerRef.current = marker
        }
        // Reverse geocode to get country
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}`)
          .then((r) => r.json())
          .then((data) => {
            const c = data.address?.country ?? ""
            setCountry(c)
          }).catch(() => {})
      })

      leafletInstanceRef.current = map
    } catch (e) {
      console.error("Leaflet init error", e)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const results = await res.json()
      if (!results.length) { toast.error("Lugar no encontrado"); return }
      const { lat: rLat, lon: rLon, display_name } = results[0]
      const newLat = parseFloat(parseFloat(rLat).toFixed(6))
      const newLng = parseFloat(parseFloat(rLon).toFixed(6))
      setLat(newLat)
      setLng(newLng)
      // Fill name if empty
      const shortName = display_name.split(",")[0]
      if (!name) setName(shortName)
      const countryPart = display_name.split(",").at(-1)?.trim() ?? ""
      setCountry(countryPart)

      // Move map + marker
      if (leafletInstanceRef.current) {
        const L = (await import("leaflet")).default
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const map = leafletInstanceRef.current as any
        map.setView([newLat, newLng], 12)
        if (markerRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ;(markerRef.current as any).setLatLng([newLat, newLng])
        } else {
          const marker = L.marker([newLat, newLng]).addTo(map)
          markerRef.current = marker
        }
      }
    } catch { toast.error("Error al buscar") } finally { setSearching(false) }
  }

  async function handleAdd() {
    if (!name.trim()) { toast.error("Escribe el nombre del lugar"); return }
    if (lat === null || lng === null) { toast.error("Toca el mapa para colocar el pin 📍"); return }
    setSaving(true)
    try {
      await authFetch("/api/places", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), country: country.trim(), lat, lng, status, note: note.trim(), date: date || null, photos: photoUrls }),
      })
      toast.success(status === "visited" ? "¡Lugar visitado añadido! 📍" : "¡Añadido a tu lista! ⭐")
      setName(""); setCountry(""); setLat(null); setLng(null); setNote(""); setDate(""); setPhotoUrls([]); setPhotoInput(""); setSearchQuery("")
      cleanupLeaflet()
      setView("list")
      loadPlaces()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await authFetch(`/api/places/${id}`, { method: "DELETE" })
      toast.success("Lugar eliminado")
      loadPlaces()
    } catch { toast.error("Error al eliminar") }
  }

  async function handleEditSave() {
    if (!editingPlace || !editName.trim()) return
    setSaving(true)
    try {
      await authFetch(`/api/places/${editingPlace.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...editingPlace, name: editName.trim(), status: editStatus, note: editNote.trim(), date: editDate || null, photos: editPhotoUrls }),
      })
      toast.success("Lugar actualizado ✨")
      setEditingPlace(null)
      loadPlaces()
    } catch { toast.error("Error al actualizar") } finally { setSaving(false) }
  }

  async function openGalleryPicker(target: "add" | "edit") {
    setGalleryTarget(target)
    setShowGalleryPicker(true)
    setGalleryLoading(true)
    try {
      const token = await getFirebaseToken()
      const res = await fetch("/api/photos", { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      const photos = Array.isArray(data) ? data : (data?.photos ?? [])
      setGalleryPhotos(photos)
    } catch { toast.error("Error al cargar fotos") } finally { setGalleryLoading(false) }
  }

  function pickGalleryPhoto(photo: { id: string; image_url: string; thumb_url: string | null }) {
    const url = photo.thumb_url ?? photo.image_url
    if (galleryTarget === "add") {
      setPhotoUrls((p) => [...p, url])
    } else {
      setEditPhotoUrls((p) => [...p, url])
    }
    setShowGalleryPicker(false)
  }

  async function handleShare(place: Place) {
    const text = `🗺️ Visitamos ${place.name}${place.country ? ", " + place.country : ""} · ${coupleName || "nosotros"} 💕`
    try {
      if (navigator.share) {
        await navigator.share({ text })
      } else {
        await navigator.clipboard.writeText(text)
        toast.success("¡Copiado!")
      }
    } catch { /* user cancelled or clipboard failed */ }
  }

  if (!showMapModal) return null

  const tabFiltered = tab === "all" ? places : places.filter((p) => p.status === tab)
  const filtered = listFilter.trim()
    ? tabFiltered.filter((p) => {
        const q = listFilter.toLowerCase()
        return p.name.toLowerCase().includes(q) || (p.country ?? "").toLowerCase().includes(q)
      })
    : tabFiltered

  return (
    <div className="modal-overlay-bg" onClick={closeMapModal}>
      <div
        className="modal-box"
        style={{ maxHeight: "90vh", maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Leaflet CSS */}
        {view === "add" && (
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        )}

        <div className="modal-header">
          <h2 className="modal-title">🗺️ Mapa de Aventuras</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {view === "list" ? (
              <button
                style={{
                  background: "rgba(255,255,255,0.22)", border: "none", borderRadius: "var(--radius-md)",
                  fontSize: "0.75rem", padding: "0.375rem 0.875rem", color: "white", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px",
                }}
                onClick={() => { setView("add"); setLat(null); setLng(null) }}
              >
                <Plus size={13} /> Añadir lugar
              </button>
            ) : (
              <button
                style={{
                  background: "rgba(255,255,255,0.22)", border: "none", borderRadius: "var(--radius-md)",
                  fontSize: "0.75rem", padding: "0.375rem 0.875rem", color: "white", cursor: "pointer",
                  fontFamily: "inherit", fontWeight: 600,
                }}
                onClick={() => { cleanupLeaflet(); setView("list") }}
              >
                ‹ Volver
              </button>
            )}
            <button className="modal-close-btn" onClick={closeMapModal}><X size={14} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ overflowY: "auto" }}>
          {view === "add" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Status selector */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    style={{
                      flex: 1, padding: "0.625rem", borderRadius: "var(--radius-md)",
                      border: status === s.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                      background: status === s.id ? "var(--primary-lighter)" : "white",
                      cursor: "pointer", fontFamily: "inherit", fontSize: "0.8125rem", fontWeight: 600,
                      color: status === s.id ? "var(--primary)" : "var(--foreground-light)",
                    }}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>

              {/* Name */}
              <input
                className="input"
                placeholder="Nombre del lugar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />

              {/* Search bar */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="input"
                  placeholder="Buscar lugar... (o toca el mapa)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSearch}
                  disabled={searching}
                  style={{ padding: "0.5rem 0.75rem", flexShrink: 0 }}
                >
                  {searching ? "..." : <Search size={16} />}
                </button>
              </div>

              {/* Interactive map */}
              <div style={{ position: "relative" }}>
                <div
                  ref={leafletMapRef}
                  style={{
                    width: "100%", height: "240px", borderRadius: "12px",
                    border: "2px solid var(--border)", overflow: "hidden",
                  }}
                />
                {lat === null && (
                  <div style={{
                    position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)",
                    background: "rgba(139,92,246,0.9)", color: "white",
                    padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem",
                    fontWeight: 600, pointerEvents: "none", whiteSpace: "nowrap",
                  }}>
                    <MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />
                    Toca el mapa para colocar el pin
                  </div>
                )}
                {lat !== null && (
                  <div style={{
                    position: "absolute", bottom: "8px", left: "50%", transform: "translateX(-50%)",
                    background: "rgba(16,185,129,0.9)", color: "white",
                    padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem",
                    fontWeight: 600, pointerEvents: "none", whiteSpace: "nowrap",
                  }}>
                    📍 {lat.toFixed(3)}, {lng!.toFixed(3)}
                  </div>
                )}
              </div>

              {/* Note */}
              <textarea
                className="input"
                placeholder="Nota (opcional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={300}
                style={{ resize: "none" }}
              />

              {/* Visit date */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>📅 Fecha de visita (opcional)</label>
                <input
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Photos */}
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 600, marginBottom: "0.25rem", display: "block" }}>📸 Fotos (URLs)</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    className="input"
                    placeholder="Pega una URL de imagen..."
                    value={photoInput}
                    onChange={(e) => setPhotoInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && photoInput.trim()) { setPhotoUrls((p) => [...p, photoInput.trim()]); setPhotoInput("") } }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => { if (photoInput.trim()) { setPhotoUrls((p) => [...p, photoInput.trim()]); setPhotoInput("") } }}
                    style={{ padding: "0.5rem 0.75rem", flexShrink: 0 }}
                  >+</button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => openGalleryPicker("add")}
                    style={{ padding: "0.5rem 0.75rem", flexShrink: 0, fontSize: "0.75rem" }}
                  >📷 De la galería</button>
                </div>
                {photoUrls.length > 0 && (
                  <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem", overflowX: "auto" }}>
                    {photoUrls.map((url, i) => (
                      <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                        <img src={url} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--border)" }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
                        <button onClick={() => setPhotoUrls((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: "-4px", right: "-4px", background: "#EF4444", color: "white", border: "none", borderRadius: "50%", width: "18px", height: "18px", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={saving || lat === null}
              >
                {saving ? "Guardando..." : `${status === "visited" ? "📍" : "⭐"} Guardar lugar`}
              </button>
            </div>
          ) : (
            <>
              {/* Globe */}
              {places.length > 0 && (
                <div
                  ref={globeRef}
                  style={{ width: "100%", height: "240px", borderRadius: "12px", overflow: "hidden", marginBottom: "0.75rem", background: "#0a0a2e" }}
                />
              )}
              {places.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "rgba(255,255,255,0.6)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🌍</div>
                  <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem" }}>Añade vuestro primer lugar</p>
                </div>
              )}

              {/* Stats */}
              {(() => {
                const visited = places.filter((p) => p.status === "visited")
                const uniqueCountries = new Set(visited.map((p) => p.country).filter(Boolean)).size
                const lastVisitDate = visited.reduce<string | null>((best, p) => {
                  if (!p.date) return best
                  if (!best) return p.date
                  return p.date > best ? p.date : best
                }, null)
                const stats = [
                  { label: "Total", value: places.length, emoji: "🌍" },
                  { label: "Visitados", value: visited.length, emoji: "📍" },
                  { label: "Deseos", value: places.filter((p) => p.status === "wishlist").length, emoji: "⭐" },
                  { label: "Países únicos", value: uniqueCountries, emoji: "🏳️" },
                  { label: "Última visita", value: relDays(lastVisitDate), emoji: "🗓️" },
                ]
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.375rem", marginBottom: "0.75rem" }}>
                    {stats.map((s) => (
                      <div key={s.label} style={{ background: "var(--muted)", borderRadius: "var(--radius-md)", padding: "0.375rem 0.25rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.875rem" }}>{s.emoji}</div>
                        <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.875rem" }}>{s.value}</div>
                        <div style={{ fontSize: "0.5625rem", color: "var(--foreground-muted)", lineHeight: 1.2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Tab filter */}
              <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.5rem" }}>
                {(["all", "visited", "wishlist"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "0.25rem 0.625rem", borderRadius: "999px", border: "none", cursor: "pointer",
                    fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                    background: tab === t ? "var(--primary)" : "var(--muted)",
                    color: tab === t ? "white" : "var(--foreground-light)",
                  }}>
                    {t === "all" ? "Todos" : t === "visited" ? "📍 Visitados" : "⭐ Deseos"}
                  </button>
                ))}
              </div>

              {/* List search */}
              <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                <Search size={14} style={{ position: "absolute", left: "0.625rem", top: "50%", transform: "translateY(-50%)", color: "var(--foreground-muted)", pointerEvents: "none" }} />
                <input
                  className="input"
                  placeholder="Buscar por nombre o país..."
                  value={listFilter}
                  onChange={(e) => setListFilter(e.target.value)}
                  style={{ paddingLeft: "2rem", fontSize: "0.8125rem" }}
                />
              </div>

              {/* Places list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {loading ? (
                  <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>Cargando...</p>
                ) : filtered.length === 0 ? (
                  <div className="empty-state" style={{ padding: "1.5rem 0" }}>
                    <div className="empty-icon">🗺️</div>
                    <p className="empty-text">{tab === "all" ? "¡Añade vuestro primer lugar!" : tab === "visited" ? "Aún no hay lugares visitados" : "La lista de deseos está vacía"}</p>
                  </div>
                ) : filtered.map((p) => (
                  <div key={p.id}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.75rem", background: "white", borderRadius: "var(--radius-md)", border: editingPlace?.id === p.id ? "2px solid var(--primary)" : "1px solid var(--border)" }}>
                      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{p.status === "visited" ? "📍" : "⭐"}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>{p.name}</h4>
                        {p.country && <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{p.country}</p>}
                        {p.date && <p style={{ fontSize: "0.6875rem", color: "var(--primary)", marginTop: "0.125rem" }}>📅 {new Date(p.date + "T12:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                        {p.note && <p style={{ fontSize: "0.75rem", color: "var(--foreground-light)", marginTop: "0.25rem" }}>{p.note}</p>}
                        {p.photos && p.photos.length > 0 && (
                          <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem", overflowX: "auto" }}>
                            {p.photos.map((url, i) => (
                              <img key={i} src={url} alt="" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px", flexShrink: 0, border: "1px solid var(--border)" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                            ))}
                          </div>
                        )}
                      </div>
                      {p.status === "visited" && (
                        <button
                          onClick={() => handleShare(p)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "0.25rem", flexShrink: 0 }}
                          title="Compartir"
                        >
                          <Share2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingPlace(p); setEditName(p.name); setEditStatus(p.status as PlaceStatus); setEditNote(p.note ?? ""); setEditDate(p.date ?? ""); setEditPhotoUrls(p.photos ?? []); setEditPhotoInput("") }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "0.25rem", flexShrink: 0, fontSize: "0.875rem" }}
                      >✏️</button>
                      <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "0.25rem", flexShrink: 0 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {editingPlace?.id === p.id && (
                      <div style={{ background: "var(--primary-lighter)", borderRadius: "0 0 var(--radius-md) var(--radius-md)", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "none" }}>
                        <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" autoFocus />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {STATUS_OPTIONS.map((s) => (
                            <button key={s.id} onClick={() => setEditStatus(s.id)} style={{
                              flex: 1, padding: "0.375rem", borderRadius: "var(--radius-sm)", cursor: "pointer",
                              border: editStatus === s.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                              background: editStatus === s.id ? "var(--primary-lighter)" : "white",
                              fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                              color: editStatus === s.id ? "var(--primary)" : "var(--foreground-light)",
                            }}>{s.emoji} {s.label}</button>
                          ))}
                        </div>
                        <textarea className="input" rows={2} value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Nota (opcional)" style={{ resize: "none" }} maxLength={300} />
                        <input type="date" className="input" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                        <div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                              className="input"
                              placeholder="URL de foto..."
                              value={editPhotoInput}
                              onChange={(e) => setEditPhotoInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter" && editPhotoInput.trim()) { setEditPhotoUrls((p) => [...p, editPhotoInput.trim()]); setEditPhotoInput("") } }}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="btn btn-primary" onClick={() => { if (editPhotoInput.trim()) { setEditPhotoUrls((p) => [...p, editPhotoInput.trim()]); setEditPhotoInput("") } }} style={{ padding: "0.375rem 0.625rem", flexShrink: 0 }}>+</button>
                            <button type="button" className="btn btn-outline" onClick={() => openGalleryPicker("edit")} style={{ padding: "0.375rem 0.5rem", flexShrink: 0, fontSize: "0.7rem" }}>📷 De la galería</button>
                          </div>
                          {editPhotoUrls.length > 0 && (
                            <div style={{ display: "flex", gap: "0.375rem", marginTop: "0.375rem", overflowX: "auto" }}>
                              {editPhotoUrls.map((url, i) => (
                                <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                                  <img src={url} alt="" style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border)" }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3" }} />
                                  <button onClick={() => setEditPhotoUrls((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: "-4px", right: "-4px", background: "#EF4444", color: "white", border: "none", borderRadius: "50%", width: "16px", height: "16px", fontSize: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-primary" onClick={handleEditSave} disabled={saving} style={{ flex: 1 }}>
                            {saving ? "..." : "Guardar"}
                          </button>
                          <button className="btn btn-outline" onClick={() => setEditingPlace(null)} style={{ flex: 1 }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gallery picker modal */}
      {showGalleryPicker && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowGalleryPicker(false)}
        >
          <div
            style={{
              background: "white", borderRadius: "var(--radius-lg)", padding: "1rem",
              width: "min(340px, 90vw)", maxHeight: "70vh", display: "flex", flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>📷 Seleccionar foto</span>
              <button
                onClick={() => setShowGalleryPicker(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "0.25rem" }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {galleryLoading ? (
                <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.875rem", padding: "1.5rem 0" }}>Cargando...</p>
              ) : galleryPhotos.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--foreground-muted)", fontSize: "0.875rem", padding: "1.5rem 0" }}>No hay fotos en la galería</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                  {galleryPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => pickGalleryPhoto(photo)}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: "8px", padding: 0, cursor: "pointer", overflow: "hidden" }}
                    >
                      <img
                        src={photo.thumb_url ?? photo.image_url}
                        alt=""
                        style={{ width: "60px", height: "60px", objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3" }}
                      />
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
