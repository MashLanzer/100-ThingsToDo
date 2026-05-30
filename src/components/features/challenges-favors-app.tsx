"use client"

import React, { useState, useMemo, useEffect } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"
import { CheckCircle, Trophy, Trash2, Heart, Map, Moon, Palette, Star, Sparkles, Gift, Layers, Shuffle, Pencil, CheckCircle2, Users } from "lucide-react"
import { PullToRefresh } from "@/components/shared/pull-to-refresh"
import { PhoneLoader } from "@/components/features/phone-loader"
import type { Favor, FavorDifficulty, FavorCategory } from "@/types"
import { useAuth } from "@/hooks/use-auth"

// ── Challenge data ────────────────────────────────────────────────────────────

interface ChallengeTask { emoji: string; text: string }

const CHALLENGES: ChallengeTask[] = [
  { emoji: "🍿", text: "Maratón de vuestra saga de películas favorita." },
  { emoji: "🍪", text: "Hornear galletas o un postre juntos." },
  { emoji: "🗺️", text: "Dar un paseo en coche o a pie sin un destino fijo." },
  { emoji: "📸", text: "Recrear una foto vuestra de cuando empezasteis." },
  { emoji: "🎲", text: "Noche de juegos de mesa." },
  { emoji: "🎨", text: "Pintar un cuadro juntos, cada uno empezando en un lado." },
  { emoji: "🏺", text: "Tomar una clase de cerámica o alfarería." },
  { emoji: "📸", text: "Hacer una sesión de fotos temática en casa." },
  { emoji: "📝", text: "Escribir una historia corta juntos, un párrafo cada uno." },
  { emoji: "🎵", text: "Componer una canción tonta sobre vuestra relación." },
  { emoji: "✂️", text: "Crear un collage o 'vision board' de vuestros sueños futuros." },
  { emoji: "🍕", text: "Hacer pizzas caseras, cada uno con sus ingredientes favoritos." },
  { emoji: "🍣", text: "Intentar hacer sushi por primera vez." },
  { emoji: "🍹", text: "Noche de cócteles: inventar una bebida que os represente." },
  { emoji: "🍰", text: "Hacer una cata a ciegas de chocolates o postres." },
  { emoji: "🌍", text: "Cocinar una cena temática de un país que queráis visitar." },
  { emoji: "🌲", text: "Hacer una ruta de senderismo fácil en un parque natural cercano." },
  { emoji: "🧺", text: "Preparar un picnic elaborado y buscar un lugar bonito." },
  { emoji: "⭐", text: "Noche de observar las estrellas lejos de la ciudad." },
  { emoji: "🚲", text: "Alquilar bicicletas y recorrer un carril bici o paseo marítimo." },
  { emoji: "🛶", text: "Alquilar un kayak o barca de pedales en un lago." },
  { emoji: "🏛️", text: "Visitar un museo o exposición que no conozcáis." },
  { emoji: "📚", text: "Ir a una librería y elegir un libro para el otro." },
  { emoji: "🗣️", text: "Aprender 10 frases básicas de un idioma nuevo juntos." },
  { emoji: "🗺️", text: "Planificar unas vacaciones de ensueño, aunque no las hagáis pronto." },
  { emoji: "🧐", text: "Ver un documental sobre un tema que os interese a ambos." },
  { emoji: "🧩", text: "Empezar un puzzle de 1000 piezas juntos." },
  { emoji: "🎮", text: "Jugar a un videojuego cooperativo." },
  { emoji: "🎳", text: "Ir a jugar a los bolos." },
  { emoji: "🎤", text: "Noche de karaoke en casa." },
  { emoji: "💆", text: "Tarde de spa en casa: masajes y mascarillas." },
  { emoji: "🧘", text: "Hacer una sesión de yoga o meditación guiada para parejas." },
  { emoji: "🛁", text: "Preparar un baño relajante con espuma y velas." },
  { emoji: "📵", text: "Tarde 'sin tecnología': móviles apagados." },
  { emoji: "💤", text: "Día de pereza total: desayuno en la cama y películas." },
  { emoji: "🎞️", text: "Ver vuestros vídeos antiguos juntos." },
  { emoji: "💌", text: "Leer cartas o mensajes antiguos que os hayáis enviado." },
  { emoji: "🎶", text: "Escuchar la música que oíais cuando empezasteis a salir." },
  { emoji: "🖼️", text: "Crear un álbum de fotos digital del último año." },
  { emoji: "📍", text: "Visitar el lugar de vuestra primera cita." },
  { emoji: "🪴", text: "Plantar algo juntos: una planta o hierbas aromáticas." },
  { emoji: "🔨", text: "Montar un mueble de IKEA juntos." },
  { emoji: "❓", text: "Hacer el test de '36 preguntas para enamorarse'." },
  { emoji: "❤️‍🔥", text: "Hablar sobre vuestros 'lenguajes del amor'." },
  { emoji: "📜", text: "Crear una 'Constitución de la Pareja' con vuestras reglas." },
  { emoji: "💭", text: "Jugar a '¿Qué prefieres?' con preguntas profundas o graciosas." },
  { emoji: "🏆", text: "Crear los 'Premios Anuales de la Pareja'." },
  { emoji: "🕺", text: "Aprender una coreografía de baile de TikTok o YouTube." },
  { emoji: "🧗", text: "Probar una sesión de iniciación en un rocódromo." },
  { emoji: "🎯", text: "Definir 3 metas personales y 3 de pareja para el próximo año." },
  { emoji: "🌮", text: "Noche mexicana: tacos, guacamole y margaritas." },
  { emoji: "🕯️", text: "Cena a la luz de las velas sin electricidad." },
  { emoji: "🥐", text: "Desayunar en una pastelería o cafetería bonita." },
  { emoji: "💐", text: "Regalarse flores mutuamente sin un motivo especial." },
  { emoji: "🍦", text: "Hacer una ruta por las mejores heladerías de la ciudad." },
  { emoji: "✈️", text: "Planificar un viaje por carretera (road trip)." },
]

function getCategory(text: string) {
  const t = text.toLowerCase()
  if (t.includes("amor") || t.includes("cartas") || t.includes("primera cita") || t.includes("lenguajes")) return "romantic"
  if (t.includes("senderismo") || t.includes("kayak") || t.includes("bicicleta") || t.includes("viaje") || t.includes("ruta") || t.includes("turistas")) return "adventure"
  if (t.includes("spa") || t.includes("yoga") || t.includes("meditación") || t.includes("baño") || t.includes("masaje") || t.includes("pereza")) return "chill"
  if (t.includes("pintar") || t.includes("escribir") || t.includes("canción") || t.includes("cerámica") || t.includes("fotos") || t.includes("collage")) return "creative"
  return "all"
}

const CATS: { id: string; Icon: React.FC<{size?: number}>; label: string; bg: string }[] = [
  { id: "all",       Icon: Layers,  label: "Todos",    bg: "#8B5CF6" },
  { id: "romantic",  Icon: Heart,   label: "Romántico", bg: "#EC4899" },
  { id: "adventure", Icon: Map,     label: "Aventura",  bg: "#F59E0B" },
  { id: "chill",     Icon: Moon,    label: "Relax",     bg: "#10B981" },
  { id: "creative",  Icon: Palette, label: "Creativo",  bg: "#3B82F6" },
]

const CAT_COLORS: Record<string, { from: string; to: string }> = {
  all:       { from: "#8B5CF6", to: "#EC4899" },
  romantic:  { from: "#EC4899", to: "#F472B6" },
  adventure: { from: "#F59E0B", to: "#EF4444" },
  chill:     { from: "#10B981", to: "#3B82F6" },
  creative:  { from: "#3B82F6", to: "#8B5CF6" },
}

interface DbChallenge { id: string; challenge_text: string; category: string; is_completed: boolean; accepted_by: string; accepted_at: string }

// ── Favors data ───────────────────────────────────────────────────────────────

const DIFFICULTIES: { id: FavorDifficulty; label: string; pts: number; stars: number }[] = [
  { id: "easy",   label: "Fácil",   pts: 10, stars: 1 },
  { id: "medium", label: "Medio",   pts: 25, stars: 2 },
  { id: "hard",   label: "Difícil", pts: 50, stars: 3 },
]

const CATEGORIES: { id: FavorCategory; label: string; Icon: React.FC<{size?: number}> }[] = [
  { id: "romantic", label: "Romántico", Icon: Heart },
  { id: "fun",      label: "Divertido", Icon: Sparkles },
  { id: "help",     label: "Ayuda",     Icon: Users },
  { id: "surprise", label: "Sorpresa",  Icon: Gift },
]

// ─────────────────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

export function ChallengesFavorsApp({ onBack }: Props) {
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState<"challenge" | "favors">("challenge")

  // ── Challenge state ───────────────────────────────────────────────────────
  const [category, setCategory] = useState("all")
  const [challenge, setChallenge] = useState<ChallengeTask | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dbChallenge, setDbChallenge] = useState<DbChallenge | null>(null)
  const [loadingChallenge, setLoadingChallenge] = useState(true)
  const [challengeHistory, setChallengeHistory] = useState<DbChallenge[]>([])
  const [challengeSubTab, setChallengeSubTab] = useState<"today" | "history">("today")

  const filtered = useMemo(
    () => CHALLENGES.filter((c) => category === "all" || getCategory(c.text) === category),
    [category]
  )
  const catColor = CAT_COLORS[category] ?? CAT_COLORS.all

  // ── Favors state ──────────────────────────────────────────────────────────
  const [favTab, setFavTab] = useState<"active" | "completed" | "create">("active")
  const [favors, setFavors] = useState<Favor[]>([])
  const [loadingFavors, setLoadingFavors] = useState(true)
  const [favTitle, setFavTitle] = useState("")
  const [favDesc, setFavDesc] = useState("")
  const [difficulty, setDifficulty] = useState<FavorDifficulty>("medium")
  const [favCategory, setFavCategory] = useState<FavorCategory>("romantic")
  const [savingFavor, setSavingFavor] = useState(false)
  const [favCategoryFilter, setFavCategoryFilter] = useState<FavorCategory | "all">("all")

  // ── Custom challenge state ────────────────────────────────────────────────
  const [showCustomChallenge, setShowCustomChallenge] = useState(false)
  const [customChallengeText, setCustomChallengeText] = useState("")

  // ── Auth helper ───────────────────────────────────────────────────────────
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

  // ── Challenge logic ───────────────────────────────────────────────────────
  useEffect(() => { loadActiveChallenge() }, [])
  useEffect(() => {
    const t = setInterval(loadActiveChallenge, 30_000)
    return () => clearInterval(t)
  }, [])

  async function loadActiveChallenge() {
    setLoadingChallenge(true)
    try {
      const data = await authFetch("/api/challenges/daily")
      const todayChallenge = data?.today
      if (todayChallenge?.challenge_text) {
        setDbChallenge(todayChallenge)
        const found = CHALLENGES.find((c) => c.text === todayChallenge.challenge_text)
        if (found) {
          setChallenge(found)
          setAccepted(!todayChallenge.is_completed)
          setCompleted(todayChallenge.is_completed)
        }
      }
      if (Array.isArray(data?.history)) setChallengeHistory(data.history)
    } catch { /* */ } finally { setLoadingChallenge(false) }
  }

  function pickRandom() {
    const pool = filtered.filter((c) => c.text !== challenge?.text)
    setChallenge(pool[Math.floor(Math.random() * pool.length)])
    setAccepted(false); setCompleted(false); setDbChallenge(null)
  }

  function handleAccept() {
    if (!challenge) return
    setAccepted(true)
    toast.success("¡Reto aceptado! 🎉")
    authFetch("/api/challenges/daily", {
      method: "POST",
      body: JSON.stringify({ challenge_text: challenge.text, category: getCategory(challenge.text) }),
    }).catch(() => { /* */ })
  }

  async function handleComplete() {
    if (!challenge || saving) return
    setSaving(true)
    try {
      if (dbChallenge?.id) {
        await authFetch("/api/challenges/daily", {
          method: "PATCH",
          body: JSON.stringify({ id: dbChallenge.id }),
        })
      } else {
        await authFetch("/api/challenges/daily", {
          method: "POST",
          body: JSON.stringify({ challenge_text: challenge.text, category: getCategory(challenge.text) }),
        })
      }
      setCompleted(true)
      toast.success("¡Reto completado! 🏆 ¡Sois los mejores!")
    } catch { toast.error("Error al guardar") } finally { setSaving(false) }
  }

  // ── Favors logic ──────────────────────────────────────────────────────────
  useEffect(() => { loadFavors() }, [])
  useEffect(() => {
    const t = setInterval(loadFavors, 20_000)
    return () => clearInterval(t)
  }, [])

  async function loadFavors() {
    setLoadingFavors(true)
    try { setFavors(await authFetch("/api/favors")) } catch { /* */ } finally { setLoadingFavors(false) }
  }

  async function handleCreateFavor() {
    if (!favTitle.trim()) { toast.error("Escribe un título"); return }
    const pts = DIFFICULTIES.find((d) => d.id === difficulty)?.pts ?? 25
    setSavingFavor(true)
    try {
      await authFetch("/api/favors", {
        method: "POST",
        body: JSON.stringify({ title: favTitle.trim(), description: favDesc.trim(), difficulty, category: favCategory, points: pts }),
      })
      toast.success("Favor creado 💝")
      setFavTitle(""); setFavDesc(""); setFavTab("active")
      loadFavors()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error") } finally { setSavingFavor(false) }
  }

  async function handleCompleteFavor(id: string) {
    try {
      await authFetch(`/api/favors/${id}/complete`, { method: "PATCH" })
      toast.success("¡Favor completado! 🎉")
      loadFavors()
    } catch { toast.error("Error") }
  }

  async function handleDeleteFavor(id: string) {
    if (!confirm("¿Eliminar este favor?")) return
    try {
      await authFetch(`/api/favors/${id}`, { method: "DELETE" })
      toast.success("Favor eliminado")
      loadFavors()
    } catch { toast.error("Error al eliminar") }
  }

  const activeFavors = favors.filter((f) => !f.is_completed)
  const completedFavors = favors.filter((f) => f.is_completed)

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>{mainTab === "challenge" ? <><Shuffle size={14} /> Reto del Día</> : <><Gift size={14} /> Favores</>}</span>
      </div>

      {/* Main tab bar — pill style */}
      <div style={{ padding: "0.5rem 0.75rem 0", background: "white", flexShrink: 0 }}>
        <div className="pill-tab-container">
          {([
            { id: "challenge", Icon: Shuffle, label: "Reto" },
            { id: "favors",    Icon: Gift,    label: "Favores" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={`pill-tab-btn${mainTab === tab.id ? " active" : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
            ><tab.Icon size={12} />{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── CHALLENGE TAB ── */}
      {mainTab === "challenge" && (
        <>
        {/* Sub-tabs: Today / History */}
        <div style={{ padding: "0.375rem 0.75rem 0", background: "white", flexShrink: 0 }}>
          <div className="pill-tab-container">
            {([
              { id: "today",   label: "Hoy" },
              { id: "history", label: "Historial" },
            ] as const).map((t) => (
              <button key={t.id} onClick={() => setChallengeSubTab(t.id)}
                className={`pill-tab-btn${challengeSubTab === t.id ? " active" : ""}`}
                style={{ fontSize: "0.6875rem" }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        {challengeSubTab === "history" ? (
          <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {loadingChallenge ? <PhoneLoader /> : challengeHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <div style={{ fontSize: "2rem" }}>📜</div>
                <p style={{ color: "var(--foreground-muted)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>No hay retos completados aún</p>
              </div>
            ) : challengeHistory.map((h) => {
              const found = CHALLENGES.find((c) => c.text === h.challenge_text)
              const color = CAT_COLORS[h.category] ?? CAT_COLORS.all
              return (
                <div key={h.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.75rem",
                  padding: "0.75rem", borderRadius: "var(--radius-lg)",
                  background: h.is_completed ? "linear-gradient(135deg, #D1FAE511, #A7F3D011)" : "white",
                  border: `1px solid ${h.is_completed ? "#10B98133" : "var(--border)"}`,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: `linear-gradient(135deg, ${color.from}33, ${color.to}33)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem",
                  }}>
                    {found?.emoji ?? "🎲"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4, marginBottom: "0.25rem" }}>
                      {h.challenge_text}
                    </p>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {h.is_completed && (
                        <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#065F46", background: "#10B98122", padding: "1px 6px", borderRadius: "999px" }}>
                          🏆 Completado
                        </span>
                      )}
                      <span style={{ fontSize: "0.625rem", color: "var(--foreground-muted)" }}>
                        {new Date(h.accepted_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
        <PullToRefresh onRefresh={loadActiveChallenge} style={{ gap: "0.75rem", padding: "0.75rem" }}>
          {/* Category chips */}
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            {CATS.map((c) => (
              <button key={c.id}
                onClick={() => { setCategory(c.id); if (!dbChallenge) { setChallenge(null); setAccepted(false); setCompleted(false) } }}
                style={{
                  padding: "0.25rem 0.625rem", borderRadius: "999px",
                  fontSize: "0.6875rem", fontWeight: 700, fontFamily: "inherit",
                  cursor: "pointer", border: "none",
                  background: category === c.id ? c.bg : "#f0ebfa",
                  color: category === c.id ? "white" : "#7C3AED",
                  display: "inline-flex", alignItems: "center", gap: "4px",
                }}
              ><c.Icon size={12} />{c.label}</button>
            ))}
          </div>

          {loadingChallenge ? (
            <PhoneLoader />
          ) : !challenge ? (
            <div style={{
              background: `linear-gradient(135deg, ${catColor.from}22, ${catColor.to}22)`,
              border: `2px dashed ${catColor.from}66`, borderRadius: "20px",
              padding: "2rem 1.25rem", display: "flex", flexDirection: "column",
              alignItems: "center", gap: "0.875rem", textAlign: "center",
            }}>
              <div style={{ fontSize: "3rem", lineHeight: 1 }}>🎁</div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "1rem", color: "#2D1B3E", marginBottom: "0.25rem", fontFamily: "'Fredoka', sans-serif" }}>
                  ¿Listos para un nuevo reto?
                </p>
                <p style={{ fontSize: "0.75rem", color: "#6B5B7E" }}>{filtered.length} retos disponibles</p>
              </div>
              {showCustomChallenge ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                  <textarea className="textarea" rows={3} placeholder="Escribe vuestro reto personalizado..." value={customChallengeText} onChange={(e) => setCustomChallengeText(e.target.value)} maxLength={200} autoFocus />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => {
                      if (!customChallengeText.trim()) return
                      setChallenge({ emoji: "✨", text: customChallengeText.trim() })
                      setShowCustomChallenge(false)
                      setCustomChallengeText("")
                      setAccepted(false)
                      setCompleted(false)
                      setDbChallenge(null)
                    }}>✅ Usar este reto</button>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCustomChallenge(false)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <button onClick={pickRandom} style={{
                    padding: "0.75rem 1.5rem", borderRadius: "999px", border: "none",
                    background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`,
                    color: "white", fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                    cursor: "pointer", boxShadow: `0 6px 20px ${catColor.from}55`,
                  }}>🎲 ¡Descubrir Reto!</button>
                  <button onClick={() => setShowCustomChallenge(true)} style={{
                    padding: "0.5rem 1rem", borderRadius: "999px", border: "2px solid var(--primary)",
                    background: "white", color: "var(--primary)", fontFamily: "'Fredoka', sans-serif",
                    fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                  }}>✏️ Reto propio</button>
                </>
              )}
            </div>
          ) : (
            <>
              <div style={{
                background: completed ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)" : `linear-gradient(135deg, ${catColor.from}18, ${catColor.to}18)`,
                border: `2px solid ${completed ? "#10B981" : catColor.from}`,
                borderRadius: "20px", padding: "1.5rem 1.25rem",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center",
              }}>
                <div style={{
                  width: "72px", height: "72px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${catColor.from}33, ${catColor.to}33)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.25rem", lineHeight: 1, border: `2px solid ${catColor.from}44`,
                }}>
                  {completed ? "🏆" : challenge.emoji}
                </div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#2D1B3E", lineHeight: 1.55, margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
                  {challenge.text}
                </p>
                {completed && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#10B98122", borderRadius: "999px", padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: 700, color: "#065F46" }}>
                    <Trophy size={14} /> ¡Reto completado! ¡Sois geniales!
                  </div>
                )}
                {accepted && !completed && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "#8B5CF622", borderRadius: "999px", padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: 700, color: "#5B21B6" }}>
                    <CheckCircle size={14} /> Reto aceptado · ¡A por ello!
                  </div>
                )}
              </div>

              {!completed && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={pickRandom} style={{
                    flex: 1, padding: "0.75rem", borderRadius: "12px",
                    border: "2px solid #E9D5FF", background: "white", fontFamily: "inherit",
                    fontSize: "0.875rem", fontWeight: 700, color: "#7C3AED", cursor: "pointer",
                  }}>🔀 Otro</button>
                  {!accepted ? (
                    <button onClick={handleAccept} style={{
                      flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none",
                      background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`,
                      fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                      color: "white", cursor: "pointer",
                    }}>✅ ¡Aceptar!</button>
                  ) : (
                    <button onClick={handleComplete} disabled={saving} style={{
                      flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                      color: "white", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                    }}>{saving ? "..." : "🏆 ¡Completado!"}</button>
                  )}
                </div>
              )}
              {completed && (
                <button onClick={pickRandom} style={{
                  width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                  color: "white", cursor: "pointer",
                }}>🎲 Nuevo Reto</button>
              )}
            </>
          )}
        </PullToRefresh>
        )}
        </>
      )}

      {/* ── FAVORS TAB ── */}
      {mainTab === "favors" && (
        <>
          {/* Favors sub-tab bar — pill style */}
          <div style={{ padding: "0.375rem 0.75rem", background: "white", flexShrink: 0 }}>
            <div className="pill-tab-container">
              {(["active", "completed", "create"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFavTab(t)}
                  className={`pill-tab-btn${favTab === t ? " active" : ""}`}
                  style={{ fontSize: "0.6875rem" }}
                >
                  {t === "active" ? "Activos" : t === "completed" ? "Hechos ✓" : "+ Crear"}
                </button>
              ))}
            </div>
          </div>

          <PullToRefresh onRefresh={loadFavors}>
            {favTab === "create" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <input className="input" placeholder="Título del favor" value={favTitle}
                  onChange={(e) => setFavTitle(e.target.value)} maxLength={60} />
                <textarea className="textarea" placeholder="Descripción..." rows={2} value={favDesc}
                  onChange={(e) => setFavDesc(e.target.value)} maxLength={200} />
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", marginBottom: "0.375rem", display: "block" }}>Dificultad</label>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    {DIFFICULTIES.map((d) => (
                      <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                        flex: 1, padding: "0.375rem 0.25rem", borderRadius: "var(--radius-md)",
                        border: difficulty === d.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                        background: difficulty === d.id ? "var(--primary-lighter)" : "white",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 600,
                        textAlign: "center", color: difficulty === d.id ? "var(--primary)" : "var(--foreground-light)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "1px" }}>{Array.from({ length: d.stars }).map((_, i) => <Star key={i} size={8} fill="currentColor" />)}</div><div>{d.label}</div><div>{d.pts}pts</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--foreground-muted)", marginBottom: "0.375rem", display: "block" }}>Categoría</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} onClick={() => setFavCategory(c.id)} style={{
                        padding: "0.2rem 0.5rem", borderRadius: "999px",
                        border: favCategory === c.id ? "2px solid var(--primary)" : "2px solid var(--border)",
                        background: favCategory === c.id ? "var(--primary-lighter)" : "white",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                        color: favCategory === c.id ? "var(--primary)" : "var(--foreground-light)",
                      }}>{c.label}</button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleCreateFavor} disabled={savingFavor} style={{ marginTop: "0.25rem" }}>
                  {savingFavor ? "Creando..." : "Crear Favor 💝"}
                </button>
              </div>
            )}

            {(favTab === "active" || favTab === "completed") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ padding: "0 0.75rem" }}>
                  <div className="pill-tab-container" style={{ flexWrap: "wrap" }}>
                    <button className={`pill-tab-btn${favCategoryFilter === "all" ? " active" : ""}`} style={{ fontSize: "0.625rem" }} onClick={() => setFavCategoryFilter("all")}>✨ Todos</button>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} className={`pill-tab-btn${favCategoryFilter === c.id ? " active" : ""}`} style={{ fontSize: "0.625rem" }} onClick={() => setFavCategoryFilter(c.id)}>{c.label}</button>
                    ))}
                  </div>
                </div>
                {loadingFavors ? (
                  <PhoneLoader />
                ) : (
                  (() => {
                    const displayFavors = (favTab === "active" ? activeFavors : completedFavors)
                      .filter(f => favCategoryFilter === "all" || f.category === favCategoryFilter)
                    return displayFavors.map((f) => {
                    const diff = DIFFICULTIES.find((d) => d.id === f.difficulty)
                    const cat = CATEGORIES.find((c) => c.id === f.category)
                    const catEmoji = cat?.label.split(" ")[0] ?? "💝"
                    const diffColor = f.difficulty === "easy" ? "#10B981" : f.difficulty === "medium" ? "#F59E0B" : "#EF4444"
                    return (
                      <div key={f.id} className="animate-slide-up" style={{
                        background: f.is_completed ? "var(--muted)" : "white",
                        borderRadius: "var(--radius-lg)",
                        border: f.is_completed ? "1px solid var(--border)" : "1.5px solid var(--primary-light)",
                        overflow: "hidden",
                        opacity: f.is_completed ? 0.7 : 1,
                        display: "flex",
                      }}>
                        {/* Left color strip */}
                        <div style={{
                          width: "5px",
                          background: f.is_completed ? "var(--muted-foreground)" : `linear-gradient(180deg, var(--primary), var(--secondary))`,
                          flexShrink: 0,
                        }} />
                        {/* Content */}
                        <div style={{ flex: 1, padding: "0.75rem 0.75rem 0.75rem 0.625rem" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
                            <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0 }}>{catEmoji}</span>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.3 }}>{f.title}</h4>
                              {f.description && <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", marginTop: "2px", lineHeight: 1.4 }}>{f.description}</p>}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.5rem" }}>
                            <span style={{
                              fontSize: "0.5625rem", fontWeight: 700, color: diffColor,
                              background: `${diffColor}18`, padding: "1px 6px", borderRadius: "999px",
                            }}>
                              {diff && Array.from({ length: diff.stars }).map((_, i) => <Star key={i} size={7} fill="currentColor" style={{ display: "inline" }} />)} {diff?.label}
                            </span>
                            <span style={{ fontSize: "0.5625rem", color: "var(--foreground-muted)" }}>{cat?.label}</span>
                            {!f.is_completed && (
                              <button onClick={() => handleCompleteFavor(f.id)}
                                style={{
                                  marginLeft: "auto", fontSize: "0.6875rem", fontWeight: 700,
                                  padding: "0.25rem 0.625rem", borderRadius: "999px", border: "none",
                                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                                  color: "white", cursor: "pointer", fontFamily: "inherit",
                                }}>
                                ✅ Canjear
                              </button>
                            )}
                            {f.is_completed && (
                              <span style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "var(--success-dark)", fontWeight: 700 }}>
                                ✓ {f.completed_by === user?.uid ? "Canjeado por ti" : "Canjeado por pareja"}
                              </span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFavor(f.id) }}
                              style={{ marginLeft: f.is_completed ? "0.25rem" : "0", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "2px", opacity: 0.5, display: "flex", alignItems: "center" }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                  })()
                )}
                {!loadingFavors && (favTab === "active" ? activeFavors : completedFavors).filter(f => favCategoryFilter === "all" || f.category === favCategoryFilter).length === 0 && (
                  <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
                    <div className="animate-bounce-slow" style={{ fontSize: "2.25rem" }}>{favTab === "active" ? "💝" : "🏆"}</div>
                    <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "var(--foreground)" }}>
                      {favTab === "active" ? "¡Sin favores activos!" : "¡Sin favores hechos aún!"}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
                      {favTab === "active" ? "Crea vuestro primer favor juntos 💕" : "¡Completa un favor para verlo aquí! ✨"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </PullToRefresh>
        </>
      )}
    </>
  )
}
