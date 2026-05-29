"use client"

import { useState, useEffect, useRef } from "react"
import { useAppStore } from "@/stores/app-store"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Place } from "@/types"
import { X, Plus, Trash2, Search, MapPin } from "lucide-react"

type PlaceStatus = "visited" | "wishlist"

const STATUS_OPTIONS: { id: PlaceStatus; label: string; emoji: string }[] = [
  { id: "visited",  label: "Visitado",    emoji: "📍" },
  { id: "wishlist", label: "Lista deseos", emoji: "⭐" },
]

export function MapModal() {
  const { showMapModal, closeMapModal } = useAppStore()
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "add">("list")
  const [tab, setTab] = useState<"all" | "visited" | "wishlist">("all")
  const [saving, setSaving] = useState(false)
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
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)

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
    const auth = getFirebaseAuth()
    const token = await auth.currentUser?.getIdToken()
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
        body: JSON.stringify({ name: name.trim(), country: country.trim(), lat, lng, status, note: note.trim() }),
      })
      toast.success(status === "visited" ? "¡Lugar visitado añadido! 📍" : "¡Añadido a tu lista! ⭐")
      setName(""); setCountry(""); setLat(null); setLng(null); setNote(""); setSearchQuery("")
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

  if (!showMapModal) return null

  const filtered = tab === "all" ? places : places.filter((p) => p.status === tab)

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
                className="btn btn-primary"
                style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                onClick={() => { setView("add"); setLat(null); setLng(null) }}
              >
                <Plus size={14} style={{ marginRight: "4px" }} /> Añadir lugar
              </button>
            ) : (
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                onClick={() => { cleanupLeaflet(); setView("list") }}
              >
                ‹ Volver
              </button>
            )}
            <button className="btn-icon" onClick={closeMapModal}><X size={18} /></button>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {[
                  { label: "Total", value: places.length, emoji: "🌍" },
                  { label: "Visitados", value: places.filter((p) => p.status === "visited").length, emoji: "📍" },
                  { label: "Deseos", value: places.filter((p) => p.status === "wishlist").length, emoji: "⭐" },
                ].map((s) => (
                  <div key={s.label} style={{ background: "var(--muted)", borderRadius: "var(--radius-md)", padding: "0.5rem", textAlign: "center" }}>
                    <div style={{ fontSize: "1rem" }}>{s.emoji}</div>
                    <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>{s.value}</div>
                    <div style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

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
                  <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.75rem", background: "white", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{p.status === "visited" ? "📍" : "⭐"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>{p.name}</h4>
                      {p.country && <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{p.country}</p>}
                      {p.note && <p style={{ fontSize: "0.75rem", color: "var(--foreground-light)", marginTop: "0.25rem" }}>{p.note}</p>}
                    </div>
                    <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "0.25rem", flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
