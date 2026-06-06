"use client"

import React, { useState, useMemo, useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import { CheckCircle, Trophy, Trash2, Heart, Map, Moon, Palette, Star, Sparkles, Gift, Layers, Shuffle, Users } from "lucide-react"
import { showConfirm } from "@/lib/confirm"
import { PullToRefresh } from "@/components/shared/pull-to-refresh"
import { PhoneLoader } from "@/components/features/phone-loader"
import type { Favor, FavorDifficulty, FavorCategory } from "@/types"
import { useAuth } from "@/hooks/use-auth"
import { useCoupleStatus } from "@/hooks/use-couple"

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

// C6: Couple levels
const LEVELS = [
  { min: 0,   name: "Cómplices 🌱",    color: "#10B981" },
  { min: 50,  name: "Enamorados 💕",   color: "#EC4899" },
  { min: 150, name: "Inseparables 💑", color: "#8B5CF6" },
  { min: 300, name: "Almas Gemelas ✨",color: "#F59E0B" },
  { min: 500, name: "Legendarios 👑",  color: "#EF4444" },
]

// C4: roulette emoji sequence
const SPIN_EMOJIS = ["🎲", "🎯", "🎪", "🎭", "🃏", "🎠", "🎡", "✨", "🌀", "💫"]

interface DbChallenge {
  id: string; challenge_text: string; category: string;
  is_completed: boolean; accepted_by: string; accepted_at: string
}

// ── Favors data ───────────────────────────────────────────────────────────────

const DIFFICULTIES: { id: FavorDifficulty; label: string; pts: number; stars: number }[] = [
  { id: "easy",   label: "Fácil",   pts: 10, stars: 1 },
  { id: "medium", label: "Medio",   pts: 25, stars: 2 },
  { id: "hard",   label: "Difícil", pts: 50, stars: 3 },
]

const CATEGORIES: { id: FavorCategory; label: string; Icon: React.FC<{size?: number}>; color: string }[] = [
  { id: "romantic", label: "Romántico", Icon: Heart,    color: "#EC4899" },
  { id: "fun",      label: "Divertido", Icon: Sparkles, color: "#F59E0B" },
  { id: "help",     label: "Ayuda",     Icon: Users,    color: "#3B82F6" },
  { id: "surprise", label: "Sorpresa",  Icon: Gift,     color: "#8B5CF6" },
]

// ─────────────────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }

export function ChallengesFavorsApp({ onBack }: Props) {
  const { user } = useAuth()
  const { data: coupleData } = useCoupleStatus()
  const partner = coupleData?.partner ?? null
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
  // C1: reveal overlay
  const [revealed, setRevealed] = useState(false)
  // C4: roulette spin
  const [spinning, setSpinning] = useState(false)
  const [spinEmoji, setSpinEmoji] = useState("🎲")
  // C5: partner confirmation step
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [showCustomChallenge, setShowCustomChallenge] = useState(false)
  const [customChallengeText, setCustomChallengeText] = useState("")

  const filtered = useMemo(
    () => CHALLENGES.filter((c) => category === "all" || getCategory(c.text) === category),
    [category]
  )
  const catColor = CAT_COLORS[category] ?? CAT_COLORS.all

  // C2: consecutive streak from history
  const streak = useMemo(() => {
    const completedDates = challengeHistory
      .filter(h => h.is_completed)
      .map(h => new Date(h.accepted_at).toDateString())
    const today = new Date()
    let count = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (completedDates.includes(d.toDateString())) count++
      else break
    }
    return count
  }, [challengeHistory])

  // ── Favors state ──────────────────────────────────────────────────────────
  const [favTab, setFavTab] = useState<"active" | "completed" | "create">("active")
  const [favors, setFavors] = useState<Favor[]>([])
  const [loadingFavors, setLoadingFavors] = useState(true)
  const [favTitle, setFavTitle] = useState("")
  const [favDesc, setFavDesc] = useState("")
  const [difficulty, setDifficulty] = useState<FavorDifficulty>("medium")
  const [favCategory, setFavCategory] = useState<FavorCategory>("romantic")
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [savingFavor, setSavingFavor] = useState(false)
  const [favCategoryFilter, setFavCategoryFilter] = useState<FavorCategory | "all">("all")
  // Fav-B: inline completion note state
  const [completingFavorId, setCompletingFavorId] = useState<string | null>(null)
  const [completionNote, setCompletionNote] = useState("")

  // ── Auth helper ───────────────────────────────────────────────────────────
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
          setRevealed(true) // existing challenge is always visible
        }
      }
      if (Array.isArray(data?.history)) setChallengeHistory(data.history)
    } catch { /* */ } finally { setLoadingChallenge(false) }
  }

  // C4: roulette animation then reveal
  function pickRandom() {
    const pool = filtered.filter((c) => c.text !== challenge?.text)
    if (pool.length === 0) return
    const chosen = pool[Math.floor(Math.random() * pool.length)]
    setSpinning(true)
    setChallenge(null)
    setAccepted(false); setCompleted(false); setDbChallenge(null)
    setRevealed(false); setConfirmingComplete(false)

    let i = 0
    const spinInterval = setInterval(() => {
      setSpinEmoji(SPIN_EMOJIS[i % SPIN_EMOJIS.length])
      i++
    }, 110)

    setTimeout(() => {
      clearInterval(spinInterval)
      setSpinning(false)
      setChallenge(chosen)
    }, 1150)
  }

  function handleAccept() {
    if (!challenge) return
    setAccepted(true)
    setRevealed(true) // auto-reveal on accept
    toast.success("¡Reto aceptado! 🎉")
    authFetch("/api/challenges/daily", {
      method: "POST",
      body: JSON.stringify({ challenge_text: challenge.text, category: getCategory(challenge.text) }),
    }).catch(() => { /* */ })
  }

  // C5: actual save — called after partner confirmation
  async function handleComplete() {
    if (!challenge || saving) return
    setConfirmingComplete(false)
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
        body: JSON.stringify({
          title: favTitle.trim(),
          description: favDesc.trim(),
          difficulty,
          category: favCategory,
          points: pts,
          assigned_to: assignedTo ?? undefined,
        }),
      })
      toast.success("Favor creado 💝")
      setFavTitle(""); setFavDesc(""); setAssignedTo(null); setFavTab("active")
      loadFavors()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error") } finally { setSavingFavor(false) }
  }

  async function handleCompleteFavor(id: string, note?: string) {
    try {
      await authFetch(`/api/favors/${id}/complete`, {
        method: "PATCH",
        body: JSON.stringify({ completion_note: note?.trim() || null }),
      })
      toast.success("¡Favor completado! 🎉")
      setCompletingFavorId(null)
      setCompletionNote("")
      loadFavors()
    } catch { toast.error("Error") }
  }

  async function handleDeleteFavor(id: string) {
    if (!await showConfirm({ title: "Eliminar favor", danger: true })) return
    try {
      await authFetch(`/api/favors/${id}`, { method: "DELETE" })
      toast.success("Favor eliminado")
      loadFavors()
    } catch { toast.error("Error al eliminar") }
  }

  const activeFavors = favors.filter((f) => !f.is_completed)
  const completedFavors = favors.filter((f) => f.is_completed)

  // C6: points & levels
  const totalPoints = completedFavors.reduce((sum, f) => sum + (DIFFICULTIES.find(d => d.id === f.difficulty)?.pts ?? 0), 0)
  const currentLevelIdx = [...LEVELS].map((l, i) => ({ ...l, i })).filter(l => totalPoints >= l.min).pop()?.i ?? 0
  const currentLevel = LEVELS[currentLevelIdx]
  const nextLevel = LEVELS[currentLevelIdx + 1]
  const levelProgress = nextLevel
    ? Math.min(100, ((totalPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100

  const CF_DARK_BG = "linear-gradient(160deg, #0d0d1a 0%, #140d26 55%, #0d1426 100%)"
  const CF_HEADER: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.75rem 1rem",
    background: "linear-gradient(135deg, #1a0d26 0%, #0d0d1a 100%)",
    borderBottom: "1px solid rgba(139,92,246,0.2)",
    flexShrink: 0,
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div style={CF_HEADER}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem", color: "rgba(255,255,255,0.8)", padding: "0 0.25rem", lineHeight: 1 }}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontFamily: "'Fredoka',sans-serif", fontWeight: 600, fontSize: "0.9375rem", color: "white" }}>
          {mainTab === "challenge" ? <><Shuffle size={14} color="#8b5cf6" /> Reto del Día</> : <><Gift size={14} color="#ec4899" /> Favores</>}
        </span>
        {/* C2: streak badge in header */}
        {mainTab === "challenge" && streak >= 2 && (
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: "3px",
            background: "rgba(245,158,11,0.2)",
            border: "1.5px solid rgba(245,158,11,0.5)", borderRadius: "999px",
            padding: "2px 8px", fontSize: "0.5625rem", fontWeight: 700, color: "#fcd34d",
          }}>
            🔥 {streak} días
          </div>
        )}
      </div>

      {/* Main tab bar */}
      <div style={{ padding: "0.375rem 0.75rem", background: "rgba(13,13,26,0.95)", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", gap: "0.25rem", padding: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "999px" }}>
          {([
            { id: "challenge", Icon: Shuffle, label: "Reto", color: "#8b5cf6" },
            { id: "favors",    Icon: Gift,    label: "Favores", color: "#ec4899" },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              style={{
                flex: 1, padding: "0.3125rem 0.5rem", borderRadius: "999px", border: "none",
                background: mainTab === tab.id ? `linear-gradient(135deg, ${tab.color}cc, ${tab.color}99)` : "transparent",
                color: mainTab === tab.id ? "white" : "rgba(255,255,255,0.45)",
                fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700,
                cursor: "pointer", transition: "all 0.15s",
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px",
              }}
            ><tab.Icon size={12} />{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ── CHALLENGE TAB ── */}
      {mainTab === "challenge" && (
        <>
          <div style={{ padding: "0.3125rem 0.75rem", background: "rgba(13,13,26,0.9)", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", gap: "0.25rem", padding: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "999px" }}>
              {([
                { id: "today",   label: "Hoy" },
                { id: "history", label: "Historial" },
              ] as const).map((t) => (
                <button key={t.id} onClick={() => setChallengeSubTab(t.id)}
                  style={{
                    flex: 1, padding: "0.25rem 0.5rem", borderRadius: "999px", border: "none",
                    background: challengeSubTab === t.id ? "rgba(139,92,246,0.5)" : "transparent",
                    color: challengeSubTab === t.id ? "white" : "rgba(255,255,255,0.4)",
                    fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {challengeSubTab === "history" ? (
            <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, overflowY: "auto", background: CF_DARK_BG }}>
              {loadingChallenge ? <PhoneLoader /> : challengeHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                  <div style={{ fontSize: "2rem" }}>📜</div>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8125rem", marginTop: "0.375rem" }}>No hay retos completados aún</p>
                </div>
              ) : challengeHistory.map((h) => {
                const found = CHALLENGES.find((c) => c.text === h.challenge_text)
                const color = CAT_COLORS[h.category] ?? CAT_COLORS.all
                return (
                  <div key={h.id} style={{
                    display: "flex", alignItems: "flex-start", gap: "0.75rem",
                    padding: "0.75rem", borderRadius: "14px",
                    background: h.is_completed ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${h.is_completed ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)"}`,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${color.from}33, ${color.to}22)`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem",
                    }}>
                      {found?.emoji ?? "🎲"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, marginBottom: "0.25rem" }}>
                        {h.challenge_text}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        {h.is_completed && (
                          <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "#6ee7b7", background: "rgba(16,185,129,0.18)", padding: "1px 6px", borderRadius: "999px" }}>
                            🏆 Completado
                          </span>
                        )}
                        <span style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.35)" }}>
                          {new Date(h.accepted_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
          <PullToRefresh onRefresh={loadActiveChallenge} style={{ gap: "0.75rem", padding: "0.75rem", background: CF_DARK_BG }}>
            {/* C2: streak banner (≥3 days) */}
            {streak >= 3 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                background: "linear-gradient(135deg, #FEF3C7, #FDE68A)",
                border: "1.5px solid #F59E0B44",
                borderRadius: "var(--radius-lg)", padding: "0.625rem 0.875rem",
              }}>
                <span style={{ fontSize: "1.5rem" }}>🔥</span>
                <div>
                  <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#92400E", margin: 0 }}>
                    ¡{streak} días seguidos!
                  </p>
                  <p style={{ fontSize: "0.625rem", color: "#B45309", margin: 0 }}>Sois una pareja imparable 💪</p>
                </div>
              </div>
            )}

            {/* Category chips */}
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {CATS.map((c) => (
                <button key={c.id}
                  onClick={() => { setCategory(c.id); if (!dbChallenge) { setChallenge(null); setAccepted(false); setCompleted(false) } }}
                  style={{
                    padding: "0.3125rem 0.75rem", borderRadius: "999px",
                    fontSize: "0.6875rem", fontWeight: 700, fontFamily: "inherit",
                    cursor: "pointer",
                    border: category === c.id ? `1.5px solid ${c.bg}` : "1.5px solid rgba(255,255,255,0.1)",
                    background: category === c.id ? `${c.bg}22` : "rgba(255,255,255,0.05)",
                    color: category === c.id ? c.bg : "rgba(255,255,255,0.5)",
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    transition: "all 0.15s",
                  }}
                ><c.Icon size={12} />{c.label}</button>
              ))}
            </div>

            {loadingChallenge ? (
              <PhoneLoader />
            ) : /* C4: roulette spinning state */ spinning ? (
              <div style={{
                background: `linear-gradient(135deg, ${catColor.from}22, ${catColor.to}22)`,
                border: `2px solid ${catColor.from}66`, borderRadius: "20px",
                padding: "2.5rem 1.25rem", display: "flex", flexDirection: "column",
                alignItems: "center", gap: "1rem", textAlign: "center",
              }}>
                <div style={{
                  fontSize: "3.5rem", lineHeight: 1,
                  animation: "rouletteSpinEmoji 0.15s linear infinite",
                }}>{spinEmoji}</div>
                <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "white", margin: 0 }}>
                  Eligiendo tu reto...
                </p>
                <div style={{ display: "flex", gap: "5px", marginTop: "0.25rem" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: "8px", height: "8px", borderRadius: "50%",
                      background: catColor.from,
                      animation: `dotPulse 0.6s ${i * 0.2}s ease-in-out infinite alternate`,
                    }} />
                  ))}
                </div>
              </div>
            ) : !challenge ? (
              <div style={{
                background: `linear-gradient(135deg, ${catColor.from}22, ${catColor.to}22)`,
                border: `2px dashed ${catColor.from}66`, borderRadius: "20px",
                padding: "2rem 1.25rem", display: "flex", flexDirection: "column",
                alignItems: "center", gap: "0.875rem", textAlign: "center",
              }}>
                <div style={{ fontSize: "3rem", lineHeight: 1 }}>🎁</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "white", marginBottom: "0.25rem", fontFamily: "'Fredoka', sans-serif" }}>
                    ¿Listos para un nuevo reto?
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{filtered.length} retos disponibles</p>
                </div>
                {showCustomChallenge ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                    <textarea
                      style={{ width: "100%", padding: "0.625rem", borderRadius: "12px", border: "1.5px solid rgba(139,92,246,0.3)", background: "rgba(255,255,255,0.06)", color: "white", fontFamily: "inherit", fontSize: "0.875rem", resize: "none", boxSizing: "border-box", outline: "none" }}
                      rows={3} placeholder="Escribe vuestro reto personalizado..." value={customChallengeText} onChange={(e) => setCustomChallengeText(e.target.value)} maxLength={200} autoFocus />
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button style={{ flex: 2, padding: "0.625rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", fontFamily: "'Fredoka',sans-serif", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }} onClick={() => {
                        if (!customChallengeText.trim()) return
                        setChallenge({ emoji: "✨", text: customChallengeText.trim() })
                        setShowCustomChallenge(false); setCustomChallengeText("")
                        setAccepted(false); setCompleted(false); setDbChallenge(null); setRevealed(false)
                      }}>✅ Usar este reto</button>
                      <button style={{ flex: 1, padding: "0.625rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }} onClick={() => setShowCustomChallenge(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* C4: roulette discover button */}
                    <button onClick={pickRandom} style={{
                      padding: "0.75rem 1.5rem", borderRadius: "999px", border: "none",
                      background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`,
                      color: "white", fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                      cursor: "pointer", boxShadow: `0 6px 20px ${catColor.from}55`,
                    }}>🎡 ¡Girar Ruleta!</button>
                    <button onClick={() => setShowCustomChallenge(true)} style={{
                      padding: "0.5rem 1rem", borderRadius: "999px", border: "1.5px solid rgba(139,92,246,0.4)",
                      background: "rgba(139,92,246,0.1)", color: "#a78bfa", fontFamily: "'Fredoka', sans-serif",
                      fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
                    }}>✏️ Reto propio</button>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* C1: challenge card with blur reveal overlay */}
                {(() => {
                  const chCat = getCategory(challenge.text)
                  const chBg = chCat === "romantic"
                    ? "rgba(236, 72, 153, 0.08)"
                    : chCat === "adventure"
                    ? "rgba(249, 115, 22, 0.08)"
                    : chCat === "creative"
                    ? "rgba(139, 92, 246, 0.08)"
                    : chCat === "chill"
                    ? "rgba(16, 185, 129, 0.08)"
                    : `linear-gradient(135deg, ${catColor.from}18, ${catColor.to}18)`
                  const chBorder = chCat === "romantic"
                    ? "rgba(236,72,153,0.2)"
                    : chCat === "adventure"
                    ? "rgba(249,115,22,0.2)"
                    : chCat === "creative"
                    ? "rgba(139,92,246,0.2)"
                    : chCat === "chill"
                    ? "rgba(16,185,129,0.2)"
                    : catColor.from
                  return (
                <div style={{ position: "relative" }}>
                  <div style={{
                    background: completed ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)" : chBg,
                    border: `2px solid ${completed ? "#10B981" : chBorder}`,
                    borderRadius: "20px", padding: "1.5rem 1.25rem",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center",
                    filter: !revealed && !completed ? "blur(5px)" : "none",
                    transition: "filter 0.4s ease",
                    userSelect: "none",
                  }}>
                    <div style={{
                      width: "72px", height: "72px", borderRadius: "50%",
                      background: `linear-gradient(135deg, ${catColor.from}33, ${catColor.to}33)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "2.25rem", lineHeight: 1, border: `2px solid ${catColor.from}44`,
                    }}>
                      {completed ? "🏆" : challenge.emoji}
                    </div>
                    <p style={{ fontSize: "0.9375rem", fontWeight: 700, color: "white", lineHeight: 1.55, margin: 0, fontFamily: "'Fredoka', sans-serif" }}>
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

                  {/* C1: tap-to-reveal overlay */}
                  {!revealed && !completed && (
                    <div
                      onClick={() => setRevealed(true)}
                      style={{
                        position: "absolute", inset: 0,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        background: `linear-gradient(135deg, ${catColor.from}90, ${catColor.to}90)`,
                        backdropFilter: "blur(2px)",
                        borderRadius: "20px",
                        cursor: "pointer", gap: "0.5rem",
                      }}
                    >
                      <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>🎲</div>
                      <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: "white", fontSize: "0.9375rem", textShadow: "0 1px 6px rgba(0,0,0,0.4)", margin: 0 }}>
                        ¡Toca para revelar!
                      </p>
                    </div>
                  )}
                </div>
                  )
                })()}

                {/* Action buttons */}
                {!completed && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={pickRandom} style={{
                      flex: 1, padding: "0.75rem", borderRadius: "12px",
                      border: "1.5px solid rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.1)",
                      fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 700, color: "#a78bfa", cursor: "pointer",
                    }}>🎡 Otro</button>
                    {!accepted ? (
                      <button onClick={handleAccept} style={{
                        flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none",
                        background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`,
                        fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                        color: "white", cursor: "pointer",
                      }}>✅ ¡Aceptar!</button>
                    ) : !confirmingComplete ? (
                      /* C5: first tap → show confirmation */
                      <button onClick={() => setConfirmingComplete(true)} style={{
                        flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none",
                        background: "linear-gradient(135deg, #10B981, #059669)",
                        fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                        color: "white", cursor: "pointer",
                      }}>🏆 ¡Completado!</button>
                    ) : (
                      /* C5: partner confirmation */
                      <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.8125rem", fontWeight: 700, color: "white", margin: 0, textAlign: "center" }}>
                          ¿Lo habéis hecho juntos? 💑
                        </p>
                        <div style={{ display: "flex", gap: "0.375rem" }}>
                          <button onClick={handleComplete} disabled={saving} style={{
                            flex: 3, padding: "0.625rem", borderRadius: "10px", border: "none",
                            background: "linear-gradient(135deg, #10B981, #059669)",
                            fontFamily: "'Fredoka', sans-serif", fontSize: "0.8125rem", fontWeight: 700,
                            color: "white", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                          }}>{saving ? "..." : "¡Sí! 🎉"}</button>
                          <button onClick={() => setConfirmingComplete(false)} style={{
                            flex: 2, padding: "0.625rem", borderRadius: "10px",
                            border: "1.5px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)",
                            fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600,
                            color: "#a78bfa", cursor: "pointer",
                          }}>Aún no</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {completed && (
                  <button onClick={pickRandom} style={{
                    width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none",
                    background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                    fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                    color: "white", cursor: "pointer",
                  }}>🎡 Nuevo Reto</button>
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
          {/* C6: Points/levels banner */}
          <div style={{
            margin: "0.5rem 0.75rem 0",
            padding: "0.625rem 0.875rem",
            background: "linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(139,92,246,0.08) 100%)",
            border: "1.5px solid rgba(236,72,153,0.3)",
            borderRadius: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.875rem", fontWeight: 700, color: "#f472b6" }}>
                {currentLevel.name}
              </span>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#f472b6" }}>
                {totalPoints} pts
              </span>
            </div>
            <div style={{ height: "5px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${levelProgress}%`,
                background: `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel?.color ?? currentLevel.color})`,
                borderRadius: "999px", transition: "width 0.6s ease",
              }} />
            </div>
            {nextLevel && (
              <p style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.5)", margin: "0.25rem 0 0", textAlign: "right" }}>
                {nextLevel.min - totalPoints} pts para {nextLevel.name}
              </p>
            )}
          </div>

          {/* Favors sub-tabs */}
          <div style={{ padding: "0.3125rem 0.75rem", background: "rgba(13,13,26,0.9)", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", gap: "0.25rem", padding: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "999px" }}>
              {(["active", "completed", "create"] as const).map((t) => (
                <button key={t} onClick={() => setFavTab(t)}
                  style={{
                    flex: 1, padding: "0.25rem 0.375rem", borderRadius: "999px", border: "none",
                    background: favTab === t ? "linear-gradient(135deg, #ec4899cc, #ec489988)" : "transparent",
                    color: favTab === t ? "white" : "rgba(255,255,255,0.4)",
                    fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {t === "active" ? "Activos" : t === "completed" ? "Hechos ✓" : "+ Crear"}
                </button>
              ))}
            </div>
          </div>

          <PullToRefresh onRefresh={loadFavors} style={{ background: CF_DARK_BG }}>
            {favTab === "create" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <input
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "12px", border: "1.5px solid rgba(236,72,153,0.25)", background: "rgba(255,255,255,0.06)", color: "white", fontFamily: "inherit", fontSize: "0.875rem", boxSizing: "border-box", outline: "none" }}
                  placeholder="Título del favor" value={favTitle} onChange={(e) => setFavTitle(e.target.value)} maxLength={60} />
                <textarea
                  style={{ width: "100%", padding: "0.625rem 0.875rem", borderRadius: "12px", border: "1.5px solid rgba(236,72,153,0.2)", background: "rgba(255,255,255,0.06)", color: "white", fontFamily: "inherit", fontSize: "0.875rem", resize: "none", boxSizing: "border-box", outline: "none" }}
                  placeholder="Descripción..." rows={2} value={favDesc} onChange={(e) => setFavDesc(e.target.value)} maxLength={200} />
                {/* Fav-A: ¿Para quién? toggle */}
                {partner && (
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: "0.375rem", display: "block" }}>¿Para quién?</label>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button onClick={() => setAssignedTo(null)} style={{
                        flex: 1, padding: "0.375rem 0.5rem", borderRadius: "12px",
                        border: assignedTo === null ? "2px solid #ec4899" : "2px solid rgba(255,255,255,0.1)",
                        background: assignedTo === null ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.05)",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                        color: assignedTo === null ? "#f9a8d4" : "rgba(255,255,255,0.5)",
                      }}>Para mí</button>
                      <button onClick={() => setAssignedTo(partner.id)} style={{
                        flex: 1, padding: "0.375rem 0.5rem", borderRadius: "12px",
                        border: assignedTo === partner.id ? "2px solid #ec4899" : "2px solid rgba(255,255,255,0.1)",
                        background: assignedTo === partner.id ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.05)",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                        color: assignedTo === partner.id ? "#f9a8d4" : "rgba(255,255,255,0.5)",
                      }}>Para mi pareja 🎁</button>
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: "0.375rem", display: "block" }}>Dificultad</label>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    {DIFFICULTIES.map((d) => {
                      const diffCol = d.id === "easy" ? "#10b981" : d.id === "medium" ? "#f59e0b" : "#ef4444"
                      return (
                        <button key={d.id} onClick={() => setDifficulty(d.id)} style={{
                          flex: 1, padding: "0.375rem 0.25rem", borderRadius: "12px",
                          border: difficulty === d.id ? `2px solid ${diffCol}` : "2px solid rgba(255,255,255,0.1)",
                          background: difficulty === d.id ? `${diffCol}20` : "rgba(255,255,255,0.05)",
                          cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 600,
                          textAlign: "center", color: difficulty === d.id ? diffCol : "rgba(255,255,255,0.5)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "1px" }}>{Array.from({ length: d.stars }).map((_, i) => <Star key={i} size={8} fill="currentColor" />)}</div>
                          <div>{d.label}</div><div>{d.pts}pts</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: "0.375rem", display: "block" }}>Categoría</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} onClick={() => setFavCategory(c.id)} style={{
                        padding: "0.2rem 0.5rem", borderRadius: "999px",
                        border: favCategory === c.id ? `2px solid ${c.color}` : "2px solid rgba(255,255,255,0.1)",
                        background: favCategory === c.id ? `${c.color}20` : "rgba(255,255,255,0.04)",
                        cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600,
                        color: favCategory === c.id ? c.color : "rgba(255,255,255,0.5)",
                      }}>{c.label}</button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreateFavor} disabled={savingFavor}
                  style={{
                    marginTop: "0.25rem", padding: "0.75rem", borderRadius: "14px", border: "none",
                    background: favTitle.trim() ? "linear-gradient(135deg, #ec4899, #be185d)" : "rgba(255,255,255,0.1)",
                    color: "white", fontFamily: "'Fredoka',sans-serif", fontSize: "1rem", fontWeight: 700,
                    cursor: favTitle.trim() && !savingFavor ? "pointer" : "not-allowed",
                    opacity: favTitle.trim() && !savingFavor ? 1 : 0.5,
                    boxShadow: favTitle.trim() ? "0 4px 16px rgba(236,72,153,0.4)" : "none",
                  }}
                >
                  {savingFavor ? "Creando..." : "Crear Favor 💝"}
                </button>
              </div>
            )}

            {(favTab === "active" || favTab === "completed") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ padding: "0 0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    {[{ id: "all" as const, label: "✨ Todos", color: "#ec4899" }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label, color: c.color }))].map((c) => {
                      const active = favCategoryFilter === c.id
                      return (
                        <button key={c.id}
                          onClick={() => setFavCategoryFilter(c.id)}
                          style={{
                            padding: "0.25rem 0.625rem", borderRadius: "999px", fontSize: "0.625rem", fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                            border: active ? `1.5px solid ${c.color}` : "1.5px solid rgba(255,255,255,0.1)",
                            background: active ? `${c.color}20` : "rgba(255,255,255,0.04)",
                            color: active ? c.color : "rgba(255,255,255,0.45)", transition: "all 0.15s",
                          }}
                        >{c.label}</button>
                      )
                    })}
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
                      const diffColor = f.difficulty === "easy" ? "#10B981" : f.difficulty === "medium" ? "#F59E0B" : "#EF4444"

                      // C3: coupon-style card
                      const currentUserId = user?.uid ?? ""
                      const partnerId = partner?.id ?? ""
                      // Fav-A: can current user complete this favor?
                      const canComplete = !f.assigned_to || f.assigned_to === currentUserId
                      const isExpandingNote = completingFavorId === f.id

                      return (
                        <div key={f.id} className="animate-slide-up" style={{ borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
                          <div style={{
                            display: "flex",
                            border: f.is_completed
                              ? "1.5px dashed var(--border)"
                              : `1.5px dashed ${cat?.color ?? "var(--primary)"}66`,
                            borderRadius: isExpandingNote ? "var(--radius-lg) var(--radius-lg) 0 0" : "var(--radius-lg)",
                            overflow: "hidden",
                            opacity: f.is_completed ? 0.75 : 1,
                            background: f.is_completed ? "var(--muted)" : "white",
                            boxShadow: f.is_completed ? "none" : `0 2px 12px ${cat?.color ?? "#8B5CF6"}1A`,
                          }}>
                            {/* Coupon left panel */}
                            <div style={{
                              width: "54px", flexShrink: 0,
                              background: f.is_completed
                                ? "#E5E7EB"
                                : `linear-gradient(180deg, ${cat?.color ?? "#8B5CF6"}22, ${cat?.color ?? "#EC4899"}11)`,
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center",
                              borderRight: `1.5px dashed ${cat?.color ?? "var(--border)"}44`,
                              gap: "4px", padding: "0.625rem 0",
                            }}>
                              <span style={{ fontSize: "1.625rem", lineHeight: 1 }}>
                                {cat?.id === "romantic" ? "💕" : cat?.id === "fun" ? "✨" : cat?.id === "help" ? "🤝" : "🎁"}
                              </span>
                              <div style={{ display: "flex", gap: "1px" }}>
                                {Array.from({ length: diff?.stars ?? 1 }).map((_, i) => (
                                  <Star key={i} size={7} fill={diffColor} color={diffColor} />
                                ))}
                              </div>
                            </div>

                            {/* Coupon content */}
                            <div style={{ flex: 1, padding: "0.625rem 0.75rem", minWidth: 0 }}>
                              <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", lineHeight: 1.3, margin: "0 0 2px" }}>
                                {f.title}
                              </h4>
                              {f.description && (
                                <p style={{ fontSize: "0.625rem", color: "var(--foreground-muted)", margin: "0 0 0.375rem", lineHeight: 1.4 }}>
                                  {f.description}
                                </p>
                              )}
                              {/* Fav-A: assignment badges */}
                              {!f.is_completed && f.assigned_to && (
                                <div style={{ marginBottom: "0.25rem" }}>
                                  {f.assigned_to === currentUserId ? (
                                    <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#7C3AED", background: "#EDE9FE", padding: "1px 6px", borderRadius: "999px" }}>
                                      🎁 Tu pareja te lo regala
                                    </span>
                                  ) : f.assigned_to === partnerId ? (
                                    <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#EC4899", background: "#FCE7F3", padding: "1px 6px", borderRadius: "999px" }}>
                                      🎁 Para tu pareja
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                                <span style={{
                                  fontSize: "0.5625rem", fontWeight: 700,
                                  color: diffColor, background: `${diffColor}18`,
                                  padding: "1px 6px", borderRadius: "999px",
                                }}>
                                  {diff?.label} · {diff?.pts}pts
                                </span>
                                {!f.is_completed ? (
                                  canComplete ? (
                                    <button onClick={() => {
                                      setCompletingFavorId(f.id)
                                      setCompletionNote("")
                                    }} style={{
                                      marginLeft: "auto", fontSize: "0.625rem", fontWeight: 700,
                                      padding: "0.25rem 0.625rem", borderRadius: "999px", border: "none",
                                      background: `linear-gradient(135deg, ${cat?.color ?? "var(--primary)"}, ${cat?.color ?? "var(--secondary)"})`,
                                      color: "white", cursor: "pointer", fontFamily: "inherit",
                                    }}>
                                      ✅ Canjear
                                    </button>
                                  ) : (
                                    <span style={{ marginLeft: "auto", fontSize: "0.5625rem", color: "var(--foreground-muted)", fontStyle: "italic" }}>
                                      Solo tu pareja puede canjear
                                    </span>
                                  )
                                ) : (
                                  <span style={{ marginLeft: "auto", fontSize: "0.5625rem", color: "var(--success-dark)", fontWeight: 700 }}>
                                    ✓ {f.completed_by === user?.uid ? "Tú" : "Pareja"}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteFavor(f.id) }}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", padding: "2px", opacity: 0.5, display: "flex", alignItems: "center" }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                              {/* Fav-B: completion note on completed favors */}
                              {f.is_completed && f.completion_note && (
                                <p style={{ fontSize: "0.5625rem", color: "var(--foreground-muted)", margin: "0.25rem 0 0", fontStyle: "italic", lineHeight: 1.4 }}>
                                  &ldquo;{f.completion_note}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Fav-B: inline note expansion */}
                          {isExpandingNote && (
                            <div style={{
                              border: `1.5px dashed ${cat?.color ?? "var(--primary)"}66`,
                              borderTop: "none",
                              borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                              background: "white",
                              padding: "0.625rem 0.75rem",
                              display: "flex", flexDirection: "column", gap: "0.375rem",
                            }}>
                              <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--foreground-muted)", margin: 0 }}>
                                ¿Quieres añadir una nota?
                              </p>
                              <textarea
                                className="textarea"
                                rows={2}
                                placeholder="Opcional..."
                                value={completionNote}
                                onChange={(e) => setCompletionNote(e.target.value)}
                                maxLength={200}
                                style={{ fontSize: "0.75rem" }}
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: "0.375rem" }}>
                                <button
                                  onClick={() => handleCompleteFavor(f.id)}
                                  style={{
                                    flex: 1, padding: "0.375rem 0.5rem", borderRadius: "999px", border: "none",
                                    background: "var(--muted)", color: "var(--foreground-muted)",
                                    fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 600, cursor: "pointer",
                                  }}
                                >
                                  Completar sin nota
                                </button>
                                <button
                                  onClick={() => handleCompleteFavor(f.id, completionNote)}
                                  style={{
                                    flex: 2, padding: "0.375rem 0.5rem", borderRadius: "999px", border: "none",
                                    background: `linear-gradient(135deg, ${cat?.color ?? "var(--primary)"}, ${cat?.color ?? "var(--secondary)"})`,
                                    color: "white", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700, cursor: "pointer",
                                  }}
                                >
                                  Completar ✓
                                </button>
                              </div>
                            </div>
                          )}
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

      <style>{`
        @keyframes rouletteSpinEmoji {
          from { transform: rotate(-12deg) scale(0.9); }
          to   { transform: rotate(12deg)  scale(1.1); }
        }
        @keyframes dotPulse {
          from { transform: translateY(0); opacity: 0.4; }
          to   { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
