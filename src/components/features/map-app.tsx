"use client"

import { useState, useEffect, useRef } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { useAppStore } from "@/stores/app-store"
import { toast } from "sonner"
import type { Place } from "@/types"
import { Search, Globe, MapPin, Star, Plane, type LucideProps } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import { PhoneLoader } from "@/components/features/phone-loader"

type PlaceStatus = "visited" | "wishlist"
interface Props { onBack: () => void }

const APP_CSS = `
@keyframes spinGlobe {
  0%   { transform: rotate(0deg) scale(1); }
  25%  { transform: rotate(10deg) scale(1.05); }
  75%  { transform: rotate(-10deg) scale(1.05); }
  100% { transform: rotate(0deg) scale(1); }
}
@keyframes flyPlane {
  0%   { transform: translateX(-10px) translateY(0px); opacity: 1; }
  50%  { transform: translateX(6px) translateY(-3px); opacity: 1; }
  100% { transform: translateX(-10px) translateY(0px); opacity: 1; }
}
@keyframes pinDrop {
  0%   { opacity: 0; transform: translateY(-18px) scale(0.9); }
  60%  { transform: translateY(4px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes starPulse {
  0%,100% { transform: scale(1); filter: brightness(1); }
  50%      { transform: scale(1.35); filter: brightness(1.4); }
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes globeBounce {
  0%,100% { transform: translateY(0) rotate(0deg); }
  30%     { transform: translateY(-8px) rotate(-8deg); }
  60%     { transform: translateY(-4px) rotate(6deg); }
}
@keyframes countUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes glowPulse {
  0%,100% { box-shadow: 0 0 8px rgba(56,189,248,0.4); }
  50%     { box-shadow: 0 0 20px rgba(56,189,248,0.8); }
}
@keyframes mapSlideIn {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}
.map-progress-bar {
  height: 3px; background: rgba(255,255,255,0.15); border-radius: 4px; overflow: hidden;
}
.map-progress-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  transition: width 0.6s ease;
}
`

const PLACE_EMOJIS = ["🗼","🏔️","🏖️","🏕️","🌋","🏝️","🏙️","🗺️","⛩️","🏯","🗽","🏜️","🌅","🌊","🏞️"]

function placeEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("playa") || n.includes("beach") || n.includes("costa")) return "🏖️"
  if (n.includes("montaña") || n.includes("mountain") || n.includes("sierra")) return "🏔️"
  if (n.includes("paris") || n.includes("torre")) return "🗼"
  if (n.includes("desierto") || n.includes("desert") || n.includes("sahara")) return "🏜️"
  if (n.includes("isla") || n.includes("island")) return "🏝️"
  if (n.includes("ciudad") || n.includes("city") || n.includes("york")) return "🏙️"
  const idx = (name.charCodeAt(0) + name.charCodeAt(name.length - 1)) % PLACE_EMOJIS.length
  return PLACE_EMOJIS[idx]
}

const STATUS_OPTIONS: { id: PlaceStatus; emoji: string; label: string; gradient: string; border: string }[] = [
  { id: "visited",  emoji: "📍", label: "Ya fuimos",      gradient: "linear-gradient(135deg,#064e3b,#065f46)", border: "#34d399" },
  { id: "wishlist", emoji: "⭐", label: "Queremos ir",    gradient: "linear-gradient(135deg,#78350f,#92400e)", border: "#fbbf24" },
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
  const [foundLocation, setFoundLocation] = useState(false)

  const [name, setName] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [status, setStatus] = useState<PlaceStatus>("wishlist")
  const [note, setNote] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)

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
    setFoundLocation(false)
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
        setFoundLocation(true)
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
      toast.success("¡Destino guardado! ✈️")
      setName(""); setCountry(""); setLat(""); setLng(""); setNote(""); setSearchQuery("")
      setStatus("wishlist"); setFoundLocation(false)
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
    setStatus("wishlist"); setFoundLocation(false); setFormStep(1); setView("add")
  }

  const filtered = tab === "all" ? places : places.filter((p) => p.status === tab)
  const visitedCount = places.filter((p) => p.status === "visited").length
  const wishlistCount = places.filter((p) => p.status === "wishlist").length

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.15)",
    borderRadius: 12, padding: "0.625rem 0.875rem", color: "#f1f5f9",
    fontSize: "0.875rem", fontFamily: "inherit", outline: "none",
    transition: "border-color 0.2s",
  }

  // ── ADD FORM ──────────────────────────────────────────────────────────────
  if (view === "add") {
    return (
      <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#050d1a 0%,#0a1f3d 50%,#0f2f52 100%)", display: "flex", flexDirection: "column", animation: "mapSlideIn 0.3s ease" }}>
        <style>{APP_CSS}</style>

        {/* Header */}
        <div style={{ padding: "0.875rem 1rem 0.625rem", display: "flex", alignItems: "center", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => formStep === 2 ? setFormStep(1) : setView("list")}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ‹
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "1rem", color: "#f1f5f9", margin: 0 }}>
              {formStep === 1 ? "📍 Ubicación" : "✨ Detalles"}
            </p>
            <div className="map-progress-bar" style={{ marginTop: 4 }}>
              <div className="map-progress-fill" style={{ width: formStep === 1 ? "50%" : "100%" }} />
            </div>
          </div>
          <span style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 700, background: "rgba(255,255,255,0.08)", padding: "2px 8px", borderRadius: 20 }}>{formStep}/2</span>
        </div>

        <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem", overflowY: "auto" }}>
          {formStep === 1 ? (
            <>
              {/* Search */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  ref={searchRef}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Buscar ciudad o lugar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  style={{
                    flexShrink: 0, padding: "0 0.875rem", border: "none", borderRadius: 12, cursor: "pointer",
                    background: searching ? "rgba(56,189,248,0.3)" : "linear-gradient(135deg,#0ea5e9,#6366f1)",
                    color: "#fff", fontWeight: 700, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 6,
                    animation: searching ? "none" : undefined,
                  }}
                >
                  {searching ? <span style={{ display: "inline-block", animation: "spinGlobe 1s linear infinite" }}>⏳</span> : <Search size={15} />}
                </button>
              </div>

              {/* Location found preview */}
              {foundLocation && (
                <div style={{ background: "rgba(56,189,248,0.12)", border: "1.5px solid rgba(56,189,248,0.4)", borderRadius: 14, padding: "0.75rem 1rem", animation: "slideDown 0.3s ease", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.75rem" }}>📍</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#38bdf8", margin: 0 }}>{name}</p>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "2px 0 0" }}>{lat}, {lng}</p>
                  </div>
                </div>
              )}

              <input style={inputStyle} placeholder="Nombre del lugar" value={name} onChange={(e) => setName(e.target.value)} />
              <input style={inputStyle} placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Latitud" value={lat} onChange={(e) => setLat(e.target.value)} type="number" step="any" />
                <input style={{ ...inputStyle, flex: 1 }} placeholder="Longitud" value={lng} onChange={(e) => setLng(e.target.value)} type="number" step="any" />
              </div>

              <button
                onClick={() => {
                  if (!name.trim() || !country.trim()) { toast.error("Nombre y país son requeridos"); return }
                  setFormStep(2)
                }}
                style={{ padding: "0.75rem", border: "none", borderRadius: 14, cursor: "pointer", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", marginTop: 4 }}
              >
                Siguiente →
              </button>
            </>
          ) : (
            <>
              {/* Location summary */}
              <div style={{ background: "rgba(56,189,248,0.1)", border: "1.5px solid rgba(56,189,248,0.3)", borderRadius: 14, padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.75rem" }}>{placeEmoji(name)}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#f1f5f9", margin: 0 }}>{name}</p>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "2px 0 0" }}>{country}</p>
                </div>
              </div>

              {/* Status selector */}
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "#94a3b8", marginBottom: "0.5rem" }}>¿Ya fuisteis o está en la lista?</p>
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatus(s.id)}
                      style={{
                        flex: 1, padding: "0.75rem 0.5rem", borderRadius: 14, cursor: "pointer", fontFamily: "inherit",
                        border: status === s.id ? `2px solid ${s.border}` : "2px solid rgba(255,255,255,0.1)",
                        background: status === s.id ? s.gradient : "rgba(255,255,255,0.05)",
                        transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        boxShadow: status === s.id ? `0 0 16px ${s.border}44` : "none",
                      }}
                    >
                      <span style={{ fontSize: "1.5rem" }}>{s.emoji}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: status === s.id ? "#f1f5f9" : "#94a3b8" }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                style={{ ...inputStyle, resize: "none", minHeight: 80 }}
                placeholder="¿Qué recuerdas de ese lugar? (opcional)"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {/* Live preview card */}
              {name && (
                <div style={{ background: status === "visited" ? "linear-gradient(135deg,#064e3b88,#065f4688)" : "linear-gradient(135deg,#78350f88,#92400e88)", border: `1.5px solid ${status === "visited" ? "#34d399" : "#fbbf24"}44`, borderRadius: 14, padding: "0.625rem 0.875rem", display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>{placeEmoji(name)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#f1f5f9", margin: 0 }}>{name || "Nombre"}</p>
                    <p style={{ fontSize: "0.6875rem", color: "#94a3b8", margin: "2px 0 0" }}>{country || "País"}</p>
                  </div>
                  <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: status === "visited" ? "#34d399" : "#fbbf24", color: status === "visited" ? "#064e3b" : "#78350f" }}>
                    {status === "visited" ? "Visitado" : "Pendiente"}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", marginTop: 4 }}>
                <button onClick={() => setFormStep(1)} style={{ flex: 1, padding: "0.75rem", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 14, cursor: "pointer", background: "rgba(255,255,255,0.05)", color: "#94a3b8", fontWeight: 600, fontFamily: "inherit" }}>
                  ← Volver
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ flex: 2, padding: "0.75rem", border: "none", borderRadius: 14, cursor: saving ? "not-allowed" : "pointer", background: saving ? "rgba(56,189,248,0.3)" : "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontFamily: "inherit" }}
                >
                  {saving
                    ? <><span style={{ animation: "flyPlane 0.8s ease infinite" }}>✈️</span> Guardando...</>
                    : "Guardar destino"
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100%", background: "linear-gradient(160deg,#050d1a 0%,#0a1f3d 50%,#0f2f52 100%)", display: "flex", flexDirection: "column" }}>
      <style>{APP_CSS}</style>

      {/* Header */}
      <div style={{ padding: "0.875rem 1rem 0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
          <button
            onClick={onBack}
            style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ‹
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.1875rem", color: "#f1f5f9", margin: 0 }}>
              🗺️ Aventuras
            </p>
            <p style={{ fontSize: "0.6875rem", color: "#64748b", margin: 0 }}>Nuestros destinos juntos</p>
          </div>
          <button
            onClick={openGlobe}
            style={{ background: "rgba(56,189,248,0.15)", border: "1.5px solid rgba(56,189,248,0.4)", borderRadius: 12, padding: "0.375rem 0.625rem", cursor: "pointer", color: "#38bdf8", fontSize: "0.6875rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, animation: "glowPulse 2.5s ease infinite" }}
          >
            <Globe size={12} /> Ver mapa
          </button>
        </div>

        {/* Stats banner */}
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "0.625rem 0.875rem", display: "flex", gap: "0.75rem", alignItems: "center", animation: "countUp 0.5s ease" }}>
          <span style={{ fontSize: "0.8125rem", color: "#34d399", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            📍 <span style={{ fontSize: "1.1rem" }}>{visitedCount}</span> <span style={{ color: "#64748b", fontWeight: 500, fontSize: "0.6875rem" }}>visitados</span>
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "1rem" }}>·</span>
          <span style={{ fontSize: "0.8125rem", color: "#fbbf24", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            ⭐ <span style={{ fontSize: "1.1rem" }}>{wishlistCount}</span> <span style={{ color: "#64748b", fontWeight: 500, fontSize: "0.6875rem" }}>en lista</span>
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "1rem" }}>·</span>
          <span style={{ fontSize: "0.8125rem", color: "#818cf8", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            🌍 <span style={{ fontSize: "1.1rem" }}>{places.length}</span> <span style={{ color: "#64748b", fontWeight: 500, fontSize: "0.6875rem" }}>total</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "0.5rem 0.875rem", display: "flex", gap: "0.375rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {(["all", "visited", "wishlist"] as const).map((t) => {
          const active = tab === t
          const count = t === "all" ? places.length : t === "visited" ? visitedCount : wishlistCount
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "0.5rem 0.25rem", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                fontWeight: 700, fontSize: "0.6875rem",
                background: active ? (t === "visited" ? "rgba(52,211,153,0.2)" : t === "wishlist" ? "rgba(251,191,36,0.2)" : "rgba(129,140,248,0.2)") : "rgba(255,255,255,0.05)",
                color: active ? (t === "visited" ? "#34d399" : t === "wishlist" ? "#fbbf24" : "#818cf8") : "#64748b",
                border: active ? `1.5px solid ${t === "visited" ? "#34d39944" : t === "wishlist" ? "#fbbf2444" : "#818cf844"}` : "1.5px solid transparent",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {t === "all" ? "🌐" : t === "visited" ? "📍" : "⭐"} {t === "all" ? "Todos" : t === "visited" ? "Visitados" : "Lista"} ({count})
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "0.875rem", display: "flex", flexDirection: "column", gap: "0.625rem", overflowY: "auto" }}>
        {/* Add button */}
        <button
          onClick={startAdd}
          style={{ padding: "0.75rem", border: "none", borderRadius: 14, cursor: "pointer", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 700, fontSize: "0.9375rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Plane size={16} /> Añadir destino
        </button>

        {loading ? (
          <PhoneLoader />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "3.5rem", animation: "globeBounce 2.5s ease infinite", display: "block" }}>
              {tab === "visited" ? "📍" : tab === "wishlist" ? "⭐" : "🌍"}
            </span>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "#f1f5f9", margin: 0 }}>
              {tab === "visited" ? "¡Aún por explorar!" : tab === "wishlist" ? "¡La lista está vacía!" : "¡Tu primera aventura os espera!"}
            </p>
            <p style={{ fontSize: "0.8125rem", color: "#64748b", margin: 0 }}>
              {tab === "visited"
                ? "Añade los lugares que habéis visitado juntos"
                : tab === "wishlist"
                  ? "¿Adónde queréis ir juntos?"
                  : "Empieza a guardar vuestros destinos"
              }
            </p>
            <button
              onClick={startAdd}
              style={{ marginTop: 8, padding: "0.625rem 1.25rem", border: "none", borderRadius: 999, cursor: "pointer", background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff", fontWeight: 700, fontSize: "0.875rem" }}
            >
              ✈️ Añadir destino
            </button>
          </div>
        ) : (
          filtered.map((p, i) => {
            const isVisited = p.status === "visited"
            return (
              <div
                key={p.id}
                style={{
                  background: isVisited
                    ? "linear-gradient(135deg,#064e3b 0%,#065f46 100%)"
                    : "linear-gradient(135deg,#78350f 0%,#92400e 100%)",
                  borderRadius: 16,
                  border: `1.5px solid ${isVisited ? "#34d39944" : "#fbbf2444"}`,
                  padding: "0.75rem 0.875rem",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  animation: `pinDrop 0.4s ease both`,
                  animationDelay: `${i * 0.06}s`,
                  boxShadow: `0 4px 16px ${isVisited ? "#34d39920" : "#fbbf2420"}`,
                }}
              >
                {/* Emoji */}
                <div style={{ fontSize: "2rem", flexShrink: 0, lineHeight: 1 }}>
                  {placeEmoji(p.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 2 }}>
                    <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#f1f5f9", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </p>
                    <span style={{
                      fontSize: "0.5625rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999, flexShrink: 0,
                      background: isVisited ? "#34d399" : "#fbbf24",
                      color: isVisited ? "#064e3b" : "#78350f",
                      animation: isVisited ? undefined : "starPulse 2.5s ease infinite",
                    }}>
                      {isVisited ? "Visitado" : "Pendiente"}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.6875rem", color: isVisited ? "#6ee7b7" : "#fde68a", margin: 0, display: "flex", alignItems: "center", gap: 3 }}>
                    <MapPin size={10} /> {p.country}
                  </p>
                  {p.note && (
                    <p style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.5)", marginTop: 4, fontStyle: "italic", background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "4px 8px" }}>
                      "{p.note}"
                    </p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", padding: "0.375rem", borderRadius: 8, color: "rgba(255,255,255,0.4)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  🗑️
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
