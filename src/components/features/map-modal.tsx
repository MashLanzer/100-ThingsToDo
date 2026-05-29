"use client"

import { useState, useEffect, useRef } from "react"
import { useAppStore } from "@/stores/app-store"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import type { Place } from "@/types"
import { X, Plus, MapPin, Trash2 } from "lucide-react"

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

  // Form state
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [status, setStatus] = useState<PlaceStatus>("wishlist")
  const [note, setNote] = useState("")

  useEffect(() => {
    if (showMapModal) {
      loadPlaces()
    } else {
      // Cleanup globe
      if (globeInstanceRef.current) {
        globeInstanceRef.current = null
      }
    }
  }, [showMapModal])

  useEffect(() => {
    if (showMapModal && view === "list" && places.length > 0 && globeRef.current) {
      initGlobe()
    }
  }, [showMapModal, view, places])

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
      // Dynamically import globe.gl to avoid SSR issues
      const GlobeModule = await import("globe.gl" as never) as { default: unknown }
      const GlobeGL = GlobeModule.default as (el: HTMLElement) => {
        width: (n: number) => unknown
        height: (n: number) => unknown
        backgroundColor: (c: string) => unknown
        globeImageUrl: (url: string) => unknown
        pointsData: (data: unknown[]) => unknown
        pointLat: (fn: (d: unknown) => number) => unknown
        pointLng: (fn: (d: unknown) => number) => unknown
        pointColor: (fn: (d: unknown) => string) => unknown
        pointAltitude: (n: number) => unknown
        pointRadius: (n: number) => unknown
        pointLabel: (fn: (d: unknown) => string) => unknown
        controls: () => { autoRotate: boolean; autoRotateSpeed: number }
      }

      if (!globeRef.current) return

      const globe = GlobeGL(globeRef.current)
      globe.width(globeRef.current.offsetWidth || 380)
      globe.height(240)
      globe.backgroundColor("rgba(0,0,0,0)")
      globe.globeImageUrl("//unpkg.com/three-globe/example/img/earth-blue-marble.jpg")

      const pointData = places.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        name: p.name,
        status: p.status,
      }))

      globe.pointsData(pointData)
      globe.pointLat((d) => (d as { lat: number }).lat)
      globe.pointLng((d) => (d as { lng: number }).lng)
      globe.pointColor((d) => (d as { status: string }).status === "visited" ? "#EC4899" : "#8B5CF6")
      globe.pointAltitude(0.02)
      globe.pointRadius(0.5)
      globe.pointLabel((d) => (d as { name: string }).name)
      globe.controls().autoRotate = true
      globe.controls().autoRotateSpeed = 0.5

      globeInstanceRef.current = globe
    } catch {
      // Globe not available - show fallback list
    }
  }

  async function handleAdd() {
    if (!name.trim() || !lat || !lng) {
      toast.error("Nombre, latitud y longitud son requeridos")
      return
    }
    setSaving(true)
    try {
      await authFetch("/api/places", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          country: country.trim(),
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          status,
          note: note.trim(),
        }),
      })
      toast.success(status === "visited" ? "¡Lugar visitado añadido! 📍" : "¡Añadido a tu lista! ⭐")
      setName("")
      setCountry("")
      setLat("")
      setLng("")
      setNote("")
      setView("list")
      loadPlaces()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este lugar?")) return
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
        <div className="modal-header">
          <h2 className="modal-title">🗺️ Mapa de Aventuras</h2>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {view === "list" ? (
              <button
                className="btn btn-primary"
                style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                onClick={() => setView("add")}
              >
                <Plus size={14} style={{ marginRight: "4px" }} />
                Añadir lugar
              </button>
            ) : (
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                onClick={() => setView("list")}
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
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    style={{
                      flex: 1,
                      padding: "0.625rem",
                      borderRadius: "var(--radius-md)",
                      border: status === s.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                      background: status === s.id ? "var(--primary-lighter)" : "white",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: status === s.id ? "var(--primary)" : "var(--foreground-light)",
                    }}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>

              <input
                className="input"
                placeholder="Nombre del lugar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
              <input
                className="input"
                placeholder="País / Región (opcional)"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={60}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  className="input"
                  placeholder="Latitud (ej: 40.4168)"
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <input
                  className="input"
                  placeholder="Longitud (ej: -3.7038)"
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
              <textarea
                className="textarea"
                placeholder="Nota o recuerdo especial... (opcional)"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
              />

              <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>
                Tip: Busca el lugar en Google Maps y copia las coordenadas haciendo clic derecho.
              </p>

              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? "Guardando..." : `${status === "visited" ? "📍 Marcar como visitado" : "⭐ Añadir a lista de deseos"}`}
              </button>
            </div>
          ) : (
            <>
              {/* Globe */}
              <div
                ref={globeRef}
                style={{
                  width: "100%",
                  height: "240px",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #0d1b2a 100%)",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {loading && (
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>Cargando mapa...</p>
                )}
                {!loading && places.length === 0 && (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "2rem" }}>🌍</div>
                    <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
                      Añade vuestro primer lugar
                    </p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {[
                  { label: "Total", value: places.length, emoji: "🌍" },
                  { label: "Visitados", value: places.filter((p) => p.status === "visited").length, emoji: "📍" },
                  { label: "Deseos", value: places.filter((p) => p.status === "wishlist").length, emoji: "⭐" },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "var(--muted)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "1rem" }}>{s.emoji}</div>
                    <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: "1rem" }}>{s.value}</div>
                    <div style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Tab filter */}
              <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.5rem" }}>
                {(["all", "visited", "wishlist"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      padding: "0.25rem 0.625rem",
                      borderRadius: "999px",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: tab === t ? "var(--primary)" : "var(--muted)",
                      color: tab === t ? "white" : "var(--foreground-light)",
                    }}
                  >
                    {t === "all" ? "Todos" : t === "visited" ? "📍 Visitados" : "⭐ Deseos"}
                  </button>
                ))}
              </div>

              {/* Places list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {loading ? (
                  <p style={{ color: "var(--foreground-muted)", fontSize: "0.875rem", textAlign: "center", padding: "1rem 0" }}>
                    Cargando...
                  </p>
                ) : filtered.length === 0 ? (
                  <div className="empty-state" style={{ padding: "1.5rem 0" }}>
                    <div className="empty-icon">🗺️</div>
                    <p className="empty-text">
                      {tab === "all" ? "¡Añade vuestro primer lugar!" : tab === "visited" ? "Aún no hay lugares visitados" : "La lista de deseos está vacía"}
                    </p>
                  </div>
                ) : (
                  filtered.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.625rem",
                        padding: "0.75rem",
                        background: "white",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>
                        {p.status === "visited" ? "📍" : "⭐"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)" }}>
                          {p.name}
                        </h4>
                        {p.country && (
                          <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{p.country}</p>
                        )}
                        {p.note && (
                          <p style={{ fontSize: "0.75rem", color: "var(--foreground-light)", marginTop: "0.25rem" }}>
                            {p.note}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--foreground-muted)",
                          padding: "0.25rem",
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
