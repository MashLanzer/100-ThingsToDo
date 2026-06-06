"use client"

import { useState, useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { useAppStore } from "@/stores/app-store"
import { toast } from "sonner"
import type { Place } from "@/types"
import { Plus, Trash2, Search, Globe, MapPin, Star, Sparkles, Map, type LucideProps } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import { PhoneLoader } from "@/components/features/phone-loader"
import { useDarkMode } from "@/hooks/use-dark-mode"

type PlaceStatus = "visited" | "wishlist"

interface Props { onBack: () => void }

const STATUS_OPTIONS: { id: PlaceStatus; Icon: React.FC<LucideProps>; iconColor: string; label: string; accentBg: string; accentBorder: string }[] = [
  { id: "visited",  Icon: MapPin, iconColor: "#10b981", label: "Ya visitamos",    accentBg: "rgba(16,185,129,0.15)", accentBorder: "#10b981" },
  { id: "wishlist", Icon: Star,   iconColor: "#f59e0b", label: "En nuestra lista", accentBg: "rgba(245,158,11,0.15)", accentBorder: "#f59e0b" },
]

const MAP_CSS = `
@keyframes mapCardIn {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes globePulse {
  0%,100% { filter: drop-shadow(0 0 4px rgba(16,185,129,0.4)); }
  50%     { filter: drop-shadow(0 0 10px rgba(16,185,129,0.8)); }
}
`

export function MapApp({ onBack }: Props) {
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

  const DARK_HEADER: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.75rem 1rem",
    background: isDark
      ? "linear-gradient(135deg, #0c1a2e, #0369a1)"
      : "linear-gradient(135deg, #d4f1f9, #a0daf0)",
    borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : T.border}`,
    flexShrink: 0,
  }

  const DARK_BODY: React.CSSProperties = {
    flex: 1, overflowY: "auto", padding: "0.75rem",
    display: "flex", flexDirection: "column", gap: "0.625rem",
    background: isDark
      ? "linear-gradient(160deg, #0a1f12 0%, #162e1c 60%, #0d2418 100%)"
      : T.bg,
  }

  const BACK_BTN: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer",
    fontSize: "1.5rem", color: isDark ? "rgba(255,255,255,0.7)" : "var(--foreground)",
    padding: "0 0.25rem", lineHeight: 1,
  }

  const INPUT_DARK: React.CSSProperties = {
    width: "100%", padding: "0.625rem 0.875rem", borderRadius: "12px",
    border: `1.5px solid ${isDark ? "rgba(255,255,255,0.12)" : T.border}`,
    background: T.inputBg,
    color: T.text, fontFamily: "inherit", fontSize: "0.875rem",
    boxSizing: "border-box", outline: "none",
  }
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
      setStatus("wishlist"); setFormStep(1); setView("list")
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

  function openGlobe() { closePhoneModal(); openMapModal() }

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
        <style>{MAP_CSS}</style>
        <div style={DARK_HEADER}>
          <button style={BACK_BTN} onClick={() => formStep === 2 ? setFormStep(1) : setView("list")}>‹</button>
          <span style={{ flex: 1, fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: isDark ? "white" : "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
            {formStep === 1
              ? <><MapPin size={14} color="#10b981" /> Paso 1 · Ubicación</>
              : <><Sparkles size={14} color="#10b981" /> Paso 2 · Detalles</>
            }
          </span>
          <span style={{ fontSize: "0.6875rem", color: T.textMuted, fontWeight: 600 }}>{formStep}/2</span>
        </div>

        <div style={DARK_BODY}>
          {formStep === 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <input
                  style={{ ...INPUT_DARK, flex: 1 }}
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
                    flexShrink: 0, padding: "0 0.875rem", borderRadius: "12px", border: "none",
                    background: "linear-gradient(135deg, #10b981, #059669)", color: "white",
                    cursor: searching ? "not-allowed" : "pointer", display: "flex", alignItems: "center",
                    opacity: searching ? 0.7 : 1,
                  }}
                >
                  <Search size={15} />
                </button>
              </div>
              <input style={INPUT_DARK} placeholder="Nombre del lugar" value={name} onChange={(e) => setName(e.target.value)} />
              <input style={INPUT_DARK} placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <input style={{ ...INPUT_DARK, flex: 1 }} placeholder="Latitud" value={lat} onChange={(e) => setLat(e.target.value)} type="number" step="any" />
                <input style={{ ...INPUT_DARK, flex: 1 }} placeholder="Longitud" value={lng} onChange={(e) => setLng(e.target.value)} type="number" step="any" />
              </div>
              <button
                onClick={() => {
                  if (!name.trim() || !country.trim()) { toast.error("Nombre y país son requeridos"); return }
                  setFormStep(2)
                }}
                style={{
                  padding: "0.75rem", borderRadius: "14px", border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)", color: "white",
                  fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
                  cursor: "pointer", marginTop: "0.25rem",
                  boxShadow: "0 4px 18px rgba(16,185,129,0.4)",
                }}
              >
                Siguiente →
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{
                background: "rgba(16,185,129,0.1)", borderRadius: "14px",
                padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.625rem",
                border: "1.5px solid rgba(16,185,129,0.25)",
              }}>
                <MapPin size={20} color="#10b981" />
                <div>
                  <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#10b981", margin: 0 }}>{name}</p>
                  <p style={{ fontSize: "0.75rem", color: T.textMuted, margin: 0 }}>{country}</p>
                </div>
              </div>

              <div>
                <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: T.textSub, marginBottom: "0.5rem" }}>Estado</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStatus(s.id)}
                      style={{
                        flex: 1, padding: "0.75rem 0.375rem", borderRadius: "14px",
                        border: `2px solid ${status === s.id ? s.accentBorder : T.border}`,
                        background: status === s.id ? s.accentBg : T.muted,
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                        color: status === s.id ? s.iconColor : T.textMuted,
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                        transition: "all 0.15s",
                      }}
                    >
                      <s.Icon size={20} color={s.iconColor} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                style={{ ...INPUT_DARK, resize: "none" }}
                placeholder="Nota o recuerdo especial... (opcional)"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  style={{
                    flex: 1, padding: "0.75rem", borderRadius: "14px",
                    border: `1.5px solid ${T.border}`, background: T.muted,
                    color: T.textSub, fontFamily: "inherit", fontSize: "0.875rem",
                    fontWeight: 600, cursor: "pointer",
                  }}
                  onClick={() => setFormStep(1)}
                >
                  ← Volver
                </button>
                <button
                  style={{
                    flex: 2, padding: "0.75rem", borderRadius: "14px", border: "none",
                    background: "linear-gradient(135deg, #10b981, #059669)", color: "white",
                    fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                    boxShadow: "0 4px 18px rgba(16,185,129,0.4)",
                  }}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "💾 Guardar lugar"}
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
      <style>{MAP_CSS}</style>

      {/* Header */}
      <div style={DARK_HEADER}>
        <button style={BACK_BTN} onClick={onBack}>‹</button>
        <span style={{ flex: 1, fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: isDark ? "white" : "var(--foreground)", display: "flex", alignItems: "center", gap: 6 }}>
          <Map size={14} color="#10b981" /> Aventuras
        </span>
        <button
          onClick={openGlobe}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex" }}
          title="Ver globo"
        >
          <Globe size={16} color="#10b981" style={{ animation: "globePulse 2.5s ease-in-out infinite" }} />
        </button>
      </div>

      {/* Stats row */}
      <div style={{
        padding: "0.4375rem 1rem",
        background: isDark ? "rgba(10,31,18,0.9)" : T.surface,
        display: "flex", gap: "1rem", alignItems: "center", flexShrink: 0,
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <MapPin size={12} color="#10b981" />
          <span style={{ fontSize: "0.75rem", color: T.textMuted, fontWeight: 600 }}>
            <strong style={{ color: "#10b981" }}>{visitedCount}</strong> visitados
          </span>
        </div>
        <span style={{ color: T.border, fontSize: "0.75rem" }}>·</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Star size={12} color="#f59e0b" />
          <span style={{ fontSize: "0.75rem", color: T.textMuted, fontWeight: 600 }}>
            <strong style={{ color: "#f59e0b" }}>{wishlistCount}</strong> en lista
          </span>
        </div>
      </div>

      {/* Tab pills */}
      <div style={{ padding: "0.375rem 0.75rem", background: isDark ? "rgba(10,25,15,0.8)" : T.surface, flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: "0.25rem", padding: "3px", background: isDark ? "rgba(255,255,255,0.05)" : T.muted, borderRadius: "999px" }}>
          {(["all", "visited", "wishlist"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "0.3rem 0.5rem", borderRadius: "999px",
                border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: "0.6875rem", fontWeight: 700,
                background: tab === t
                  ? t === "visited"
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : t === "wishlist"
                    ? "linear-gradient(135deg, #f59e0b, #d97706)"
                    : isDark ? "rgba(255,255,255,0.14)" : T.surface
                  : "transparent",
                color: tab === t ? (isDark || t === "visited" || t === "wishlist" ? "white" : "var(--foreground)") : T.textMuted,
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "3px",
              }}
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

      {/* Body */}
      <div style={DARK_BODY}>
        <button
          onClick={startAdd}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
            padding: "0.75rem", borderRadius: "14px", border: "none",
            background: "linear-gradient(135deg, #10b981, #059669)", color: "white",
            fontFamily: "'Fredoka',sans-serif", fontSize: "0.9375rem", fontWeight: 700,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(16,185,129,0.35)",
          }}
        >
          <Plus size={16} /> Añadir Lugar
        </button>

        {loading ? (
          <PhoneLoader />
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ fontSize: "2.5rem", opacity: 0.4 }}>
              {tab === "visited" ? "🌍" : tab === "wishlist" ? "⭐" : "🗺️"}
            </div>
            <p style={{ fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: T.textSub, margin: 0 }}>
              {tab === "visited" ? "¡Aún por explorar!" : tab === "wishlist" ? "¡La lista está vacía!" : "¡Sin aventuras aún!"}
            </p>
            <p style={{ fontSize: "0.75rem", color: T.textMuted, margin: 0 }}>
              {tab === "visited"
                ? "Añade los lugares que habéis visitado juntos"
                : tab === "wishlist"
                  ? "¿Adónde queréis ir?"
                  : "Empieza a guardar vuestros destinos"
              }
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map((p, idx) => {
              const isVisited = p.status === "visited"
              return (
                <div
                  key={p.id}
                  style={{
                    padding: "0.75rem 0.875rem",
                    background: T.surface,
                    borderRadius: "14px",
                    border: `1px solid ${isVisited ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                    borderLeft: `4px solid ${isVisited ? "#10b981" : "#f59e0b"}`,
                    display: "flex", alignItems: "flex-start", gap: "0.625rem",
                    animation: "mapCardIn 0.3s ease both",
                    animationDelay: `${idx * 0.04}s`,
                  }}
                >
                  <div style={{ flexShrink: 0, marginTop: "1px" }}>
                    {isVisited ? <MapPin size={18} color="#10b981" /> : <Star size={18} color="#f59e0b" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.125rem" }}>
                      <p style={{ fontWeight: 700, fontSize: "0.875rem", color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                        {p.name}
                      </p>
                      <span style={{
                        fontSize: "0.5625rem", fontWeight: 700, padding: "1px 6px", borderRadius: "999px", flexShrink: 0,
                        background: isVisited ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)",
                        color: isVisited ? "#10b981" : "#f59e0b",
                      }}>
                        {isVisited ? "Visitado" : "Pendiente"}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.6875rem", color: T.textMuted, margin: 0 }}>{p.country}</p>
                    {p.note && (
                      <p style={{ fontSize: "0.625rem", color: T.textMuted, marginTop: "0.25rem", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        &ldquo;{p.note}&rdquo;
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", color: T.textMuted, flexShrink: 0 }}
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
