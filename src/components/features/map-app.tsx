"use client"

import { useState, useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { useAppStore } from "@/stores/app-store"
import { toast } from "sonner"
import type { Place } from "@/types"
import { Plus, Trash2, Search, Globe, MapPin, Star, Sparkles, Map, Plane, type LucideProps } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import { PhoneLoader } from "@/components/features/phone-loader"

type PlaceStatus = "visited" | "wishlist"

interface Props { onBack: () => void }

const STATUS_OPTIONS: { id: PlaceStatus; Icon: React.FC<LucideProps>; iconColor: string; label: string; bg: string; border: string }[] = [
  { id: "visited",  Icon: MapPin, iconColor: "#059669", label: "Ya visitamos",    bg: "#d1fae5", border: "#6ee7b7" },
  { id: "wishlist", Icon: Star,   iconColor: "#d97706", label: "En nuestra lista", bg: "#fef9c3", border: "#fde047" },
]

export function MapApp({ onBack }: Props) {
  const { openMapModal, closePhoneModal } = useAppStore()
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "add">("list")
  const [formStep, setFormStep] = useState<1 | 2>(1)
  const [tab, setTab] = useState<"all" | "visited" | "wishlist">("all")
  const [saving, setSaving] = useState(false)
  const [searching, setSearching] = useState(false)

  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [status, setStatus] = useState<PlaceStatus>("wishlist")
  const [note, setNote] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => { loadPlaces() }, [])

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
        toast.success("Ubicación encontrada")
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
      toast.success("Lugar guardado")
      setName(""); setCountry(""); setLat(""); setLng(""); setNote(""); setSearchQuery("")
      setStatus("wishlist")
      setFormStep(1)
      setView("list")
      loadPlaces()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!await showConfirm({ title: "Eliminar lugar", danger: true })) return
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

  function startAdd() {
    setName(""); setCountry(""); setLat(""); setLng(""); setNote(""); setSearchQuery("")
    setStatus("wishlist"); setFormStep(1); setView("add")
  }

  const filtered = tab === "all" ? places : places.filter((p) => p.status === tab)
  const visitedCount = places.filter((p) => p.status === "visited").length
  const wishlistCount = places.filter((p) => p.status === "wishlist").length

  if (view === "add") {
    return (
      <>
        <div className="app-content-header">
          <button className="back-btn-phone" onClick={() => formStep === 2 ? setFormStep(1) : setView("list")}>‹</button>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {formStep === 1
              ? <><MapPin size={14} /> Paso 1 · Ubicación</>
              : <><Sparkles size={14} /> Paso 2 · Detalles</>
            }
          </span>
          <span style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", fontWeight: 500 }}>{formStep}/2</span>
        </div>
        <div className="app-content-body">
          {formStep === 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <input
                  className="input"
                  placeholder="Buscar ciudad o lugar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  style={{ fontSize: "0.875rem" }}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSearch}
                  disabled={searching}
                  style={{ flexShrink: 0, padding: "0 0.75rem" }}
                >
                  <Search size={15} />
                </button>
              </div>
              <input className="input" placeholder="Nombre del lugar" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="input" placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <input className="input" placeholder="Latitud" value={lat} onChange={(e) => setLat(e.target.value)} type="number" step="any" />
                <input className="input" placeholder="Longitud" value={lng} onChange={(e) => setLng(e.target.value)} type="number" step="any" />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!name.trim() || !country.trim()) { toast.error("Nombre y país son requeridos"); return }
                  setFormStep(2)
                }}
                style={{ marginTop: "0.25rem" }}
              >
                Siguiente →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{
                background: "var(--primary-lighter)", borderRadius: "var(--radius-md)",
                padding: "0.625rem 0.875rem", display: "flex", alignItems: "center", gap: "0.5rem",
              }}>
                <MapPin size={20} color="var(--primary)" />
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--primary)" }}>{name}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>{country}</p>
                </div>
              </div>

              <div>
                <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--foreground-light)", marginBottom: "0.5rem" }}>Estado</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatus(s.id)}
                      style={{
                        flex: 1, padding: "0.625rem 0.375rem", borderRadius: "var(--radius-md)",
                        border: status === s.id ? `2px solid ${s.border}` : "2px solid var(--border)",
                        background: status === s.id ? s.bg : "white",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                        color: "var(--foreground)", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                      }}
                    >
                      <s.Icon size={20} color={s.iconColor} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="textarea"
                placeholder="Nota o recuerdo especial... (opcional)"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setFormStep(1)}>
                  ← Volver
                </button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar lugar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Map size={14} /> Aventuras</span>
        <button
          onClick={openGlobe}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}
          title="Ver globo"
        >
          <Globe size={14} color="var(--primary)" />
        </button>
      </div>

      {/* Counter */}
      <div style={{ padding: "0.5rem 1rem 0", display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--foreground-light)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          <Map size={12} /> <strong style={{ color: "var(--foreground)" }}>{visitedCount}</strong> visitados
        </span>
        <span style={{ color: "var(--border)", fontSize: "0.75rem" }}>·</span>
        <span style={{ fontSize: "0.75rem", color: "var(--foreground-light)", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          <Star size={12} /> <strong style={{ color: "var(--foreground)" }}>{wishlistCount}</strong> en lista
        </span>
      </div>

      {/* Tabs — pill style */}
      <div style={{ padding: "0.375rem 0.75rem", background: "white" }}>
        <div className="pill-tab-container">
          {(["all", "visited", "wishlist"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pill-tab-btn${tab === t ? " active" : ""}`}
              style={{ fontSize: "0.6875rem", display: "flex", alignItems: "center", gap: 3 }}
            >
              {t === "all"
                ? "Todos"
                : t === "visited"
                  ? <><MapPin size={10} /> Visitados</>
                  : <><Star size={10} /> Deseos</>
              }
            </button>
          ))}
        </div>
      </div>

      <div className="app-content-body">
        <button className="btn btn-primary" style={{ fontSize: "0.8125rem" }} onClick={startAdd}>
          <Plus size={14} /> Añadir Lugar
        </button>

        {loading ? (
          <PhoneLoader />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div className="animate-bounce-slow">
              {tab === "visited"
                ? <Globe size={36} color="var(--foreground-muted)" />
                : tab === "wishlist"
                  ? <Star size={36} color="var(--foreground-muted)" />
                  : <Map size={36} color="var(--foreground-muted)" />
              }
            </div>
            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>
              {tab === "visited" ? "¡Aún por explorar!" : tab === "wishlist" ? "¡La lista está vacía!" : "¡Sin aventuras aún!"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
              {tab === "visited"
                ? "Añade los lugares que habéis visitado juntos"
                : tab === "wishlist"
                  ? <><Plane size={12} style={{ display: "inline", verticalAlign: "middle" }} /> ¿Adónde queréis ir?</>
                  : "Empieza a guardar vuestros destinos"
              }
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map((p) => {
              const isVisited = p.status === "visited"
              return (
                <div
                  key={p.id}
                  style={{
                    padding: "0.75rem",
                    background: isVisited
                      ? "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)"
                      : "linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)",
                    borderRadius: "var(--radius-lg)",
                    border: isVisited ? "1.5px solid #a7f3d0" : "1.5px solid #fde68a",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.625rem",
                    transition: "transform 0.12s ease",
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: "1px" }}>
                    {isVisited
                      ? <MapPin size={18} color="#059669" />
                      : <Star size={18} color="#d97706" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.125rem" }}>
                      <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </p>
                      <span style={{
                        fontSize: "0.5625rem", fontWeight: 700, padding: "1px 6px", borderRadius: "999px",
                        background: isVisited ? "#6ee7b7" : "#fde047",
                        color: isVisited ? "#064e3b" : "#713f12",
                        flexShrink: 0,
                      }}>
                        {isVisited ? "Visitado" : "Pendiente"}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)" }}>{p.country}</p>
                    {p.note && (
                      <p style={{ fontSize: "0.625rem", color: "var(--foreground-light)", marginTop: "0.25rem", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{p.note}"
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", color: "var(--foreground-muted)", flexShrink: 0, opacity: 0.6 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
