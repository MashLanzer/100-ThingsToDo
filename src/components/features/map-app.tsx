"use client"

import { useState, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { useAppStore } from "@/stores/app-store"
import { toast } from "sonner"
import type { Place } from "@/types"
import { Plus, Trash2, Search, Globe } from "lucide-react"

type PlaceStatus = "visited" | "wishlist"

const STATUS_OPTIONS: { id: PlaceStatus; label: string; emoji: string }[] = [
  { id: "visited",  label: "Visitado",    emoji: "📍" },
  { id: "wishlist", label: "Lista deseos", emoji: "⭐" },
]

interface Props { onBack: () => void }

export function MapApp({ onBack }: Props) {
  const { openMapModal, closePhoneModal } = useAppStore()
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "add">("list")
  const [tab, setTab] = useState<"all" | "visited" | "wishlist">("all")
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [status, setStatus] = useState<PlaceStatus>("wishlist")
  const [note, setNote] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadPlaces()
  }, [])

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

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { "Accept-Language": "es" } }
      )
      const results = await res.json()
      if (results.length > 0) {
        const r = results[0]
        setLat(parseFloat(r.lat).toFixed(4))
        setLng(parseFloat(r.lon).toFixed(4))
        if (!name) setName(r.display_name.split(",")[0])
        if (!country) {
          const parts = r.display_name.split(",")
          setCountry(parts[parts.length - 1].trim())
        }
        toast.success("Ubicación encontrada 📍")
      } else {
        toast.error("No se encontró la ubicación")
      }
    } catch { toast.error("Error al buscar") } finally { setSearching(false) }
  }

  async function handleSave() {
    if (!name.trim() || !country.trim()) { toast.error("Nombre y país son requeridos"); return }
    const latN = parseFloat(lat)
    const lngN = parseFloat(lng)
    if (isNaN(latN) || isNaN(lngN)) { toast.error("Coordenadas inválidas"); return }
    setSaving(true)
    try {
      await authFetch("/api/places", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), country: country.trim(), lat: latN, lng: lngN, status, note: note.trim() }),
      })
      toast.success("Lugar guardado 🗺️")
      setName(""); setCountry(""); setLat(""); setLng(""); setNote(""); setSearchQuery("")
      setStatus("wishlist")
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
    } catch { toast.error("Error") }
  }

  function openGlobe() {
    closePhoneModal()
    openMapModal()
  }

  const filtered = tab === "all" ? places : places.filter((p) => p.status === tab)

  if (view === "add") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => setView("list")}>‹</button>
          <span>Añadir Lugar</span>
        </div>
        <div className="app-content-body">
          {/* Search */}
          <div style={{ display: "flex", gap: "0.375rem", marginBottom: "0.625rem" }}>
            <input
              className="input"
              placeholder="Buscar ciudad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              style={{ fontSize: "0.8125rem" }}
            />
            <button
              className="btn btn-primary"
              onClick={handleSearch}
              disabled={searching}
              style={{ flexShrink: 0, padding: "0 0.625rem" }}
            >
              <Search size={14} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input className="input" placeholder="Nombre del lugar" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <input className="input" placeholder="Lat" value={lat} onChange={(e) => setLat(e.target.value)} type="number" step="any" />
              <input className="input" placeholder="Lng" value={lng} onChange={(e) => setLng(e.target.value)} type="number" step="any" />
            </div>

            {/* Status */}
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatus(s.id)}
                  style={{
                    flex: 1, padding: "0.375rem", borderRadius: "var(--radius-md)",
                    border: status === s.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                    background: status === s.id ? "var(--primary-lighter)" : "white",
                    cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                    color: status === s.id ? "var(--primary)" : "var(--foreground-light)",
                  }}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>

            <textarea className="textarea" placeholder="Nota (opcional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />

            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Lugar 🗺️"}
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>🗺️ Aventuras</span>
        <button
          onClick={openGlobe}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
          title="Ver globo"
        >
          <Globe size={14} color="var(--primary)" />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "white" }}>
        {(["all", "visited", "wishlist"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "0.5rem 0.25rem", background: "none", border: "none",
              borderBottom: tab === t ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "var(--primary)" : "var(--foreground-muted)", marginBottom: "-1px",
            }}
          >
            {t === "all" ? "Todos" : t === "visited" ? "📍 Visitados" : "⭐ Deseos"}
          </button>
        ))}
      </div>

      <div className="app-content-body">
        <button
          className="btn btn-primary"
          style={{ marginBottom: "0.625rem", fontSize: "0.8125rem" }}
          onClick={() => setView("add")}
        >
          <Plus size={14} /> Añadir Lugar
        </button>

        {loading ? (
          <p style={{ color: "var(--foreground-muted)", fontSize: "0.8125rem", textAlign: "center" }}>Cargando...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🌍</div>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)" }}>
              {tab === "visited" ? "No hay lugares visitados aún." : tab === "wishlist" ? "No hay lugares en lista de deseos." : "No hay lugares guardados."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                style={{
                  padding: "0.625rem 0.75rem",
                  background: "white",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "1rem", flexShrink: 0 }}>{p.status === "visited" ? "📍" : "⭐"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </p>
                  <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{p.country}</p>
                  {p.note && (
                    <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", marginTop: "0.125rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.note}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", color: "var(--foreground-muted)", flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
