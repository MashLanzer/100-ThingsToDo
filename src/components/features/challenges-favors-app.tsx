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

const CATS: { id: string; Icon: React.FC<{size?: number}>; label: string; bg: string; emoji: string }[] = [
  { id: "all",       Icon: Layers,  label: "Todos",    bg: "#8B5CF6", emoji: "🎲" },
  { id: "romantic",  Icon: Heart,   label: "Romántico", bg: "#EC4899", emoji: "💕" },
  { id: "adventure", Icon: Map,     label: "Aventura",  bg: "#F59E0B", emoji: "🗺️" },
  { id: "chill",     Icon: Moon,    label: "Relax",     bg: "#10B981", emoji: "🧘" },
  { id: "creative",  Icon: Palette, label: "Creativo",  bg: "#3B82F6", emoji: "🎨" },
]

const CAT_COLORS: Record<string, { from: string; to: string }> = {
  all:       { from: "#8B5CF6", to: "#EC4899" },
  romantic:  { from: "#EC4899", to: "#F472B6" },
  adventure: { from: "#F59E0B", to: "#EF4444" },
  chill:     { from: "#10B981", to: "#3B82F6" },
  creative:  { from: "#3B82F6", to: "#8B5CF6" },
}

const LEVELS = [
  { min: 0,   name: "Cómplices",    emoji: "🌱", color: "#10B981" },
  { min: 50,  name: "Enamorados",   emoji: "💕", color: "#EC4899" },
  { min: 150, name: "Inseparables", emoji: "💑", color: "#8B5CF6" },
  { min: 300, name: "Almas Gemelas",emoji: "✨", color: "#F59E0B" },
  { min: 500, name: "Legendarios",  emoji: "👑", color: "#EF4444" },
]

const SPIN_EMOJIS = ["🎲", "🎯", "🎪", "🎭", "🃏", "🎠", "🎡", "✨", "🌀", "💫"]

interface DbChallenge {
  id: string; challenge_text: string; category: string;
  is_completed: boolean; accepted_by: string; accepted_at: string
}

const DIFFICULTIES: { id: FavorDifficulty; label: string; pts: number; stars: number }[] = [
  { id: "easy",   label: "Fácil",   pts: 10, stars: 1 },
  { id: "medium", label: "Medio",   pts: 25, stars: 2 },
  { id: "hard",   label: "Difícil", pts: 50, stars: 3 },
]

const CATEGORIES: { id: FavorCategory; label: string; Icon: React.FC<{size?: number}>; color: string; emoji: string }[] = [
  { id: "romantic", label: "Romántico", Icon: Heart,    color: "#EC4899", emoji: "💕" },
  { id: "fun",      label: "Divertido", Icon: Sparkles, color: "#F59E0B", emoji: "✨" },
  { id: "help",     label: "Ayuda",     Icon: Users,    color: "#3B82F6", emoji: "🤝" },
  { id: "surprise", label: "Sorpresa",  Icon: Gift,     color: "#8B5CF6", emoji: "🎁" },
]

const APP_CSS = `
@keyframes floatStar {
  0%   { opacity: 1; transform: translateY(0) scale(1) }
  100% { opacity: 0; transform: translateY(-90px) scale(0.4) rotate(20deg) }
}
@keyframes bobFlame {
  0%, 100% { transform: translateY(0) }
  50%       { transform: translateY(-7px) }
}
@keyframes spinRoulette {
  0%   { transform: rotate(-12deg) scale(0.85) }
  50%  { transform: rotate(12deg) scale(1.15) }
  100% { transform: rotate(-12deg) scale(0.85) }
}
@keyframes pulseGlowCat {
  0%, 100% { box-shadow: 0 0 12px var(--cat-glow) }
  50%       { box-shadow: 0 0 28px var(--cat-glow) }
}
@keyframes revealBounce {
  0%   { transform: scale(0.5); opacity: 0 }
  60%  { transform: scale(1.15) }
  100% { transform: scale(1); opacity: 1 }
}
@keyframes dotPulse {
  from { transform: translateY(0); opacity: 0.4 }
  to   { transform: translateY(-5px); opacity: 1 }
}
@keyframes fillBar {
  from { width: 0% }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px) }
  to   { opacity: 1; transform: translateX(0) }
}
`

function FloatStars({ active }: { active: boolean }) {
  if (!active) return null
  const items = ["⭐", "✨", "🏆", "🌟", "⭐", "✨"]
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}>
      {items.map((e, i) => (
        <span key={i} style={{
          position: "absolute", left: `${10 + i * 15}%`, bottom: "35%",
          fontSize: "1.75rem",
          animation: `floatStar 1.1s ease ${i * 0.12}s both`,
        }}>{e}</span>
      ))}
    </div>
  )
}

interface Props { onBack: () => void }

export function ChallengesFavorsApp({ onBack }: Props) {
  const { user } = useAuth()
  const { data: coupleData } = useCoupleStatus()
  const partner = coupleData?.partner ?? null
  const [mainTab, setMainTab] = useState<"challenge" | "favors">("challenge")

  // Challenge state
  const [category, setCategory] = useState("all")
  const [challenge, setChallenge] = useState<ChallengeTask | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dbChallenge, setDbChallenge] = useState<DbChallenge | null>(null)
  const [loadingChallenge, setLoadingChallenge] = useState(true)
  const [challengeHistory, setChallengeHistory] = useState<DbChallenge[]>([])
  const [challengeSubTab, setChallengeSubTab] = useState<"today" | "history">("today")
  const [revealed, setRevealed] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [spinEmoji, setSpinEmoji] = useState("🎲")
  const [confirmingComplete, setConfirmingComplete] = useState(false)
  const [showCustomChallenge, setShowCustomChallenge] = useState(false)
  const [customChallengeText, setCustomChallengeText] = useState("")
  const [showCompleteAnim, setShowCompleteAnim] = useState(false)

  // Favors state
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
  const [completingFavorId, setCompletingFavorId] = useState<string | null>(null)
  const [completionNote, setCompletionNote] = useState("")

  const filtered = useMemo(
    () => CHALLENGES.filter((c) => category === "all" || getCategory(c.text) === category),
    [category]
  )
  const catColor = CAT_COLORS[category] ?? CAT_COLORS.all

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { all: CHALLENGES.length }
    for (const c of ["romantic", "adventure", "chill", "creative"]) {
      counts[c] = CHALLENGES.filter(ch => getCategory(ch.text) === c).length
    }
    return counts
  }, [])

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
          setChallenge(found); setAccepted(!todayChallenge.is_completed)
          setCompleted(todayChallenge.is_completed); setRevealed(true)
        }
      }
      if (Array.isArray(data?.history)) setChallengeHistory(data.history)
    } catch { /**/ } finally { setLoadingChallenge(false) }
  }

  function pickRandom() {
    const pool = filtered.filter((c) => c.text !== challenge?.text)
    if (pool.length === 0) return
    const chosen = pool[Math.floor(Math.random() * pool.length)]
    setSpinning(true); setChallenge(null)
    setAccepted(false); setCompleted(false); setDbChallenge(null)
    setRevealed(false); setConfirmingComplete(false)
    let i = 0
    const spinInterval = setInterval(() => { setSpinEmoji(SPIN_EMOJIS[i % SPIN_EMOJIS.length]); i++ }, 110)
    setTimeout(() => { clearInterval(spinInterval); setSpinning(false); setChallenge(chosen) }, 1150)
  }

  function handleAccept() {
    if (!challenge) return
    setAccepted(true); setRevealed(true)
    toast.success("¡Reto aceptado! 🎉")
    authFetch("/api/challenges/daily", {
      method: "POST",
      body: JSON.stringify({ challenge_text: challenge.text, category: getCategory(challenge.text) }),
    }).catch(() => { /**/ })
  }

  async function handleComplete() {
    if (!challenge || saving) return
    setConfirmingComplete(false); setSaving(true)
    try {
      if (dbChallenge?.id) {
        await authFetch("/api/challenges/daily", { method: "PATCH", body: JSON.stringify({ id: dbChallenge.id }) })
      } else {
        await authFetch("/api/challenges/daily", { method: "POST", body: JSON.stringify({ challenge_text: challenge.text, category: getCategory(challenge.text) }) })
      }
      setCompleted(true)
      setShowCompleteAnim(true)
      setTimeout(() => setShowCompleteAnim(false), 1400)
      toast.success("¡Reto completado! 🏆 ¡Sois los mejores!")
    } catch { toast.error("Error al guardar") } finally { setSaving(false) }
  }

  useEffect(() => { loadFavors() }, [])
  useEffect(() => {
    const t = setInterval(loadFavors, 20_000)
    return () => clearInterval(t)
  }, [])

  async function loadFavors() {
    setLoadingFavors(true)
    try { setFavors(await authFetch("/api/favors")) } catch { /**/ } finally { setLoadingFavors(false) }
  }

  async function handleCreateFavor() {
    if (!favTitle.trim()) { toast.error("Escribe un título"); return }
    const pts = DIFFICULTIES.find((d) => d.id === difficulty)?.pts ?? 25
    setSavingFavor(true)
    try {
      await authFetch("/api/favors", {
        method: "POST",
        body: JSON.stringify({ title: favTitle.trim(), description: favDesc.trim(), difficulty, category: favCategory, points: pts, assigned_to: assignedTo ?? undefined }),
      })
      toast.success("Favor creado 💝")
      setFavTitle(""); setFavDesc(""); setAssignedTo(null); setFavTab("active")
      loadFavors()
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : "Error") } finally { setSavingFavor(false) }
  }

  async function handleCompleteFavor(id: string, note?: string) {
    try {
      await authFetch(`/api/favors/${id}/complete`, { method: "PATCH", body: JSON.stringify({ completion_note: note?.trim() || null }) })
      toast.success("¡Favor completado! 🎉")
      setCompletingFavorId(null); setCompletionNote(""); loadFavors()
    } catch { toast.error("Error") }
  }

  async function handleDeleteFavor(id: string) {
    if (!await showConfirm({ title: "Eliminar favor", danger: true })) return
    try {
      await authFetch(`/api/favors/${id}`, { method: "DELETE" })
      toast.success("Favor eliminado"); loadFavors()
    } catch { toast.error("Error al eliminar") }
  }

  const activeFavors = favors.filter((f) => !f.is_completed)
  const completedFavors = favors.filter((f) => f.is_completed)

  const totalPoints = completedFavors.reduce((sum, f) => sum + (DIFFICULTIES.find(d => d.id === f.difficulty)?.pts ?? 0), 0)
  const currentLevelIdx = [...LEVELS].map((l, i) => ({ ...l, i })).filter(l => totalPoints >= l.min).pop()?.i ?? 0
  const currentLevel = LEVELS[currentLevelIdx]
  const nextLevel = LEVELS[currentLevelIdx + 1]
  const levelProgress = nextLevel
    ? Math.min(100, ((totalPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100)
    : 100

  const challengeBg = mainTab === "challenge"
    ? "linear-gradient(160deg, #1a0a2e 0%, #3b1a6b 100%)"
    : "linear-gradient(160deg, #1a1200 0%, #3b2800 100%)"

  const currentCat = CATS.find(c => c.id === category) ?? CATS[0]
  const currentFavCat = CATEGORIES.find(c => c.id === favCategory)

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: challengeBg, overflow: "hidden" }}>
      <style>{APP_CSS}</style>
      <FloatStars active={showCompleteAnim} />

      {/* Header */}
      <div style={{ padding: "0.75rem 1rem 0.625rem", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.65)", fontSize: "1.25rem", padding: 0, lineHeight: 1 }}>‹</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700, color: "white", margin: 0 }}>
            {mainTab === "challenge" ? "🎲 Retos del Día" : "💝 Favores"}
          </h2>
        </div>
        {/* Streak badge */}
        {mainTab === "challenge" && streak >= 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px", background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: "999px", padding: "3px 8px", fontSize: "0.5625rem", fontWeight: 700, color: "#FDE68A" }}>
            <span style={{ animation: "bobFlame 1.2s ease-in-out infinite" }}>🔥</span> {streak}d
          </div>
        )}
      </div>

      {/* Main tab bar */}
      <div style={{ padding: "0 0.75rem 0.625rem", flexShrink: 0, display: "flex", gap: "0.5rem" }}>
        {([
          { id: "challenge" as const, label: "🎲 Reto", color: "#8B5CF6" },
          { id: "favors"   as const, label: "💝 Favores", color: "#F59E0B" },
        ]).map((tab) => (
          <button key={tab.id} onClick={() => setMainTab(tab.id)} style={{
            flex: 1, padding: "0.5rem 0", borderRadius: "12px", border: "none", cursor: "pointer",
            fontFamily: "'Fredoka', sans-serif", fontSize: "0.9375rem", fontWeight: 700,
            background: mainTab === tab.id ? tab.color : "rgba(255,255,255,0.08)",
            color: mainTab === tab.id ? "white" : "rgba(255,255,255,0.5)",
            transition: "all 0.2s",
            boxShadow: mainTab === tab.id ? `0 4px 16px ${tab.color}55` : "none",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── CHALLENGE TAB ── */}
      {mainTab === "challenge" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Sub-tabs */}
          <div style={{ padding: "0 0.75rem 0.5rem", flexShrink: 0, display: "flex", gap: "0.375rem" }}>
            {(["today", "history"] as const).map(t => (
              <button key={t} onClick={() => setChallengeSubTab(t)} style={{
                flex: 1, padding: "0.375rem", borderRadius: "10px", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 700,
                background: challengeSubTab === t ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                color: challengeSubTab === t ? "white" : "rgba(255,255,255,0.45)",
                transition: "all 0.15s",
              }}>{t === "today" ? "Hoy" : "Historial"}</button>
            ))}
          </div>

          {challengeSubTab === "history" ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {loadingChallenge ? <PhoneLoader /> : challengeHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📜</div>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>No hay retos completados aún</p>
                </div>
              ) : challengeHistory.map((h) => {
                const found = CHALLENGES.find((c) => c.text === h.challenge_text)
                const color = CAT_COLORS[h.category] ?? CAT_COLORS.all
                return (
                  <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.75rem", borderRadius: "14px", background: "rgba(255,255,255,0.06)", borderLeft: `3px solid ${color.from}` }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${color.from}33, ${color.to}33)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.375rem" }}>
                      {found?.emoji ?? "🎲"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", lineHeight: 1.4, marginBottom: "0.25rem" }}>{h.challenge_text}</p>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        {h.is_completed && <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#6EE7B7", background: "rgba(16,185,129,0.2)", padding: "1px 6px", borderRadius: "999px" }}>🏆 Completado</span>}
                        <span style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)" }}>
                          {new Date(h.accepted_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <PullToRefresh onRefresh={loadActiveChallenge} style={{ gap: "0.75rem", padding: "0 0.75rem 0.75rem", background: "transparent" }}>
              {/* Streak banner (≥3 days) */}
              {streak >= 3 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", background: "rgba(245,158,11,0.15)", border: "1.5px solid rgba(245,158,11,0.3)", borderRadius: "16px", padding: "0.75rem 1rem" }}>
                  <span style={{ fontSize: "2rem", lineHeight: 1, animation: "bobFlame 1.2s ease-in-out infinite" }}>🔥</span>
                  <div>
                    <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#FDE68A", margin: 0 }}>¡{streak} días seguidos!</p>
                    <p style={{ fontSize: "0.6875rem", color: "rgba(253,230,138,0.7)", margin: 0 }}>Sois una pareja imparable 💪</p>
                  </div>
                </div>
              )}

              {/* Category tabs — horizontal scroll */}
              <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
                {CATS.map((c) => (
                  <button key={c.id} onClick={() => { setCategory(c.id); if (!dbChallenge) { setChallenge(null); setAccepted(false); setCompleted(false) } }} style={{
                    flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    padding: "0.5rem 0.75rem", borderRadius: "12px", border: "none", cursor: "pointer",
                    background: category === c.id ? c.bg : "rgba(255,255,255,0.07)",
                    minWidth: "58px",
                    boxShadow: category === c.id ? `0 4px 14px ${c.bg}55` : "none",
                    transition: "all 0.2s",
                  }}>
                    <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>{c.emoji}</span>
                    <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: category === c.id ? "white" : "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>{c.label}</span>
                    <span style={{ fontSize: "0.5rem", color: category === c.id ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)" }}>{catCounts[c.id]}</span>
                  </button>
                ))}
              </div>

              {loadingChallenge ? (
                <PhoneLoader />
              ) : spinning ? (
                /* Roulette spinning state */
                <div style={{ background: `linear-gradient(135deg, ${catColor.from}22, ${catColor.to}22)`, border: `2px solid ${catColor.from}44`, borderRadius: "20px", padding: "2.5rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center" }}>
                  <div style={{ fontSize: "4.5rem", lineHeight: 1, animation: "spinRoulette 0.25s ease-in-out infinite" }}>{spinEmoji}</div>
                  <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1rem", color: "white", margin: 0 }}>Eligiendo tu reto...</p>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: catColor.from, animation: `dotPulse 0.6s ${i * 0.2}s ease-in-out infinite alternate` }} />
                    ))}
                  </div>
                </div>
              ) : !challenge ? (
                /* No challenge yet */
                <div style={{ background: `linear-gradient(135deg, ${catColor.from}18, ${catColor.to}18)`, border: `2px dashed ${catColor.from}44`, borderRadius: "20px", padding: "2rem 1.25rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem", textAlign: "center" }}>
                  <div style={{ fontSize: "3.5rem", lineHeight: 1 }}>🎁</div>
                  <div>
                    <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: "white", marginBottom: "0.25rem" }}>¿Listos para un nuevo reto?</p>
                    <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{filtered.length} retos disponibles</p>
                  </div>
                  {showCustomChallenge ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", width: "100%" }}>
                      <textarea rows={3} placeholder="Escribe vuestro reto personalizado..." value={customChallengeText} onChange={(e) => setCustomChallengeText(e.target.value)} maxLength={200} autoFocus style={{ width: "100%", padding: "0.625rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button style={{ flex: 2, padding: "0.625rem", borderRadius: "10px", border: "none", background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`, color: "white", fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }} onClick={() => {
                          if (!customChallengeText.trim()) return
                          setChallenge({ emoji: "✨", text: customChallengeText.trim() })
                          setShowCustomChallenge(false); setCustomChallengeText("")
                          setAccepted(false); setCompleted(false); setDbChallenge(null); setRevealed(false)
                        }}>✅ Usar este reto</button>
                        <button style={{ flex: 1, padding: "0.625rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }} onClick={() => setShowCustomChallenge(false)}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={pickRandom} style={{ padding: "0.875rem 2rem", borderRadius: "999px", border: "none", background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`, color: "white", fontFamily: "'Fredoka', sans-serif", fontSize: "1.0625rem", fontWeight: 700, cursor: "pointer", boxShadow: `0 8px 24px ${catColor.from}66`, transition: "transform 0.15s" }}>
                        🎡 ¡Girar Ruleta!
                      </button>
                      <button onClick={() => setShowCustomChallenge(true)} style={{ padding: "0.5rem 1.25rem", borderRadius: "999px", border: "1.5px solid rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)", fontFamily: "'Fredoka', sans-serif", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer" }}>
                        ✏️ Reto propio
                      </button>
                    </>
                  )}
                </div>
              ) : (
                /* Challenge card */
                (() => {
                  const chCat = getCategory(challenge.text)
                  const chColor = CAT_COLORS[chCat] ?? catColor
                  return (
                    <>
                      <div style={{ position: "relative" }}>
                        <div style={{
                          background: completed
                            ? "linear-gradient(135deg, #065f46, #10B981)"
                            : `linear-gradient(135deg, ${chColor.from}20, ${chColor.to}15)`,
                          border: `2px solid ${completed ? "#10B98166" : `${chColor.from}44`}`,
                          borderRadius: "20px", padding: "1.75rem 1.25rem",
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", textAlign: "center",
                          filter: !revealed && !completed ? "blur(5px)" : "none",
                          transition: "filter 0.4s ease",
                          boxShadow: accepted && !completed ? `0 0 0 1px ${chColor.from}33, 0 8px 32px ${chColor.from}33` : "none",
                        }}>
                          <div style={{
                            width: 96, height: 96, borderRadius: "50%",
                            background: `linear-gradient(135deg, ${chColor.from}33, ${chColor.to}33)`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "3rem", lineHeight: 1,
                            border: `2.5px solid ${chColor.from}55`,
                            boxShadow: accepted && !completed ? `0 0 22px ${chColor.from}55` : "none",
                            animation: completed ? "revealBounce 0.5s ease" : "none",
                          }}>
                            {completed ? "🏆" : challenge.emoji}
                          </div>
                          <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "1.0625rem", color: completed ? "white" : "rgba(255,255,255,0.92)", lineHeight: 1.55, margin: 0 }}>
                            {challenge.text}
                          </p>
                          {completed && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(255,255,255,0.2)", borderRadius: "999px", padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: 700, color: "white" }}>
                              <Trophy size={14} /> ¡Reto completado! ¡Sois geniales!
                            </div>
                          )}
                          {accepted && !completed && (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", background: "rgba(139,92,246,0.25)", borderRadius: "999px", padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: 700, color: "#C4B5FD" }}>
                              <CheckCircle size={14} /> Reto aceptado · ¡A por ello!
                            </div>
                          )}
                        </div>

                        {/* Tap-to-reveal overlay */}
                        {!revealed && !completed && (
                          <div onClick={() => setRevealed(true)} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${chColor.from}cc, ${chColor.to}cc)`, backdropFilter: "blur(2px)", borderRadius: "20px", cursor: "pointer", gap: "0.5rem" }}>
                            <div style={{ fontSize: "3rem", lineHeight: 1 }}>🎲</div>
                            <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, color: "white", fontSize: "1rem", textShadow: "0 1px 6px rgba(0,0,0,0.4)", margin: 0 }}>¡Toca para revelar!</p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!completed && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={pickRandom} style={{ flex: 1, padding: "0.75rem", borderRadius: "12px", border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", cursor: "pointer" }}>🎡 Otro</button>
                          {!accepted ? (
                            <button onClick={handleAccept} style={{ flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none", background: `linear-gradient(135deg, ${chColor.from}, ${chColor.to})`, fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: `0 4px 16px ${chColor.from}55` }}>✅ ¡Aceptar!</button>
                          ) : !confirmingComplete ? (
                            <button onClick={() => setConfirmingComplete(true)} style={{ flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #10B981, #059669)", fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 4px 16px rgba(16,185,129,0.4)" }}>🏆 ¡Completado!</button>
                          ) : (
                            <div style={{ flex: 2, display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                              <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.8125rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", margin: 0, textAlign: "center" }}>¿Lo habéis hecho juntos? 💑</p>
                              <div style={{ display: "flex", gap: "0.375rem" }}>
                                <button onClick={handleComplete} disabled={saving} style={{ flex: 3, padding: "0.625rem", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #10B981, #059669)", fontFamily: "'Fredoka', sans-serif", fontSize: "0.8125rem", fontWeight: 700, color: "white", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "..." : "¡Sí! 🎉"}</button>
                                <button onClick={() => setConfirmingComplete(false)} style={{ flex: 2, padding: "0.625rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.07)", fontFamily: "inherit", fontSize: "0.75rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", cursor: "pointer" }}>Aún no</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {completed && (
                        <button onClick={pickRandom} style={{ width: "100%", padding: "0.875rem", borderRadius: "12px", border: "none", background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`, fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700, color: "white", cursor: "pointer", boxShadow: `0 4px 16px ${catColor.from}55` }}>🎡 Nuevo Reto</button>
                      )}
                    </>
                  )
                })()
              )}
            </PullToRefresh>
          )}
        </div>
      )}

      {/* ── FAVORS TAB ── */}
      {mainTab === "favors" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Level banner */}
          <div style={{ margin: "0 0.75rem 0.5rem", padding: "0.75rem 1rem", background: `linear-gradient(135deg, ${currentLevel.color}22, ${currentLevel.color}0a)`, border: `1.5px solid ${currentLevel.color}44`, borderRadius: "14px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <span style={{ fontSize: "1.25rem" }}>{currentLevel.emoji}</span>
                <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "0.9375rem", fontWeight: 700, color: currentLevel.color }}>{currentLevel.name}</span>
              </div>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: currentLevel.color }}>{totalPoints} pts</span>
            </div>
            <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${levelProgress}%`, background: `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel?.color ?? currentLevel.color})`, borderRadius: "999px", animation: "fillBar 0.8s ease both", transition: "width 0.6s ease" }} />
            </div>
            {nextLevel && <p style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.35)", margin: "0.25rem 0 0", textAlign: "right" }}>{nextLevel.min - totalPoints} pts para {nextLevel.emoji} {nextLevel.name}</p>}
          </div>

          {/* Favors sub-tabs */}
          <div style={{ padding: "0 0.75rem 0.5rem", flexShrink: 0, display: "flex", gap: "0.375rem" }}>
            {(["active", "completed", "create"] as const).map(t => (
              <button key={t} onClick={() => setFavTab(t)} style={{
                flex: 1, padding: "0.375rem", borderRadius: "10px", border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700,
                background: favTab === t ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
                color: favTab === t ? "white" : "rgba(255,255,255,0.45)",
                transition: "all 0.15s",
              }}>{t === "active" ? "Activos" : t === "completed" ? "Hechos ✓" : "+ Crear"}</button>
            ))}
          </div>

          <PullToRefresh onRefresh={loadFavors} style={{ background: "transparent", gap: "0.5rem", padding: "0 0.75rem 0.75rem" }}>

            {/* ── CREATE TAB ── */}
            {favTab === "create" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {/* Live preview */}
                {favTitle.trim() && (
                  <div style={{ animation: "slideInRight 0.2s ease" }}>
                    <p style={{ fontSize: "0.5625rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", margin: "0 0 0.375rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Vista previa</p>
                    <div style={{ display: "flex", border: `1.5px dashed ${currentFavCat?.color ?? "#8B5CF6"}66`, borderRadius: "12px", overflow: "hidden", background: "rgba(255,255,255,0.04)" }}>
                      <div style={{ width: 44, flexShrink: 0, background: `${currentFavCat?.color ?? "#8B5CF6"}22`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", padding: "0.5rem 0", borderRight: `1.5px dashed ${currentFavCat?.color ?? "#8B5CF6"}33` }}>
                        <span style={{ fontSize: "1.375rem" }}>{currentFavCat?.emoji ?? "🎁"}</span>
                        <div style={{ display: "flex", gap: "1px" }}>
                          {Array.from({ length: DIFFICULTIES.find(d => d.id === difficulty)?.stars ?? 2 }).map((_, i) => (
                            <Star key={i} size={6} fill={DIFFICULTIES.find(d => d.id === difficulty)?.pts === 10 ? "#10B981" : DIFFICULTIES.find(d => d.id === difficulty)?.pts === 25 ? "#F59E0B" : "#EF4444"} color="transparent" />
                          ))}
                        </div>
                      </div>
                      <div style={{ flex: 1, padding: "0.5rem 0.625rem" }}>
                        <p style={{ fontSize: "0.8125rem", fontWeight: 700, color: "white", margin: 0, lineHeight: 1.3 }}>{favTitle}</p>
                        {favDesc.trim() && <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.45)", margin: "2px 0 0", lineHeight: 1.4 }}>{favDesc}</p>}
                        <span style={{ display: "inline-block", marginTop: "4px", fontSize: "0.5625rem", fontWeight: 700, color: DIFFICULTIES.find(d => d.id === difficulty)?.pts === 10 ? "#10B981" : DIFFICULTIES.find(d => d.id === difficulty)?.pts === 25 ? "#F59E0B" : "#EF4444", background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "999px" }}>
                          {DIFFICULTIES.find(d => d.id === difficulty)?.label} · {DIFFICULTIES.find(d => d.id === difficulty)?.pts}pts
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <input placeholder="Título del favor *" value={favTitle} onChange={(e) => setFavTitle(e.target.value)} maxLength={60} style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: "0.9375rem", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                <textarea placeholder="Descripción..." rows={2} value={favDesc} onChange={(e) => setFavDesc(e.target.value)} maxLength={200} style={{ width: "100%", padding: "0.625rem 0.75rem", borderRadius: "10px", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: "0.875rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />

                {partner && (
                  <div>
                    <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: "0.375rem", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>¿Para quién?</label>
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button onClick={() => setAssignedTo(null)} style={{ flex: 1, padding: "0.375rem 0.5rem", borderRadius: "10px", border: `1.5px solid ${assignedTo === null ? "#8B5CF6" : "rgba(255,255,255,0.15)"}`, background: assignedTo === null ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600, color: assignedTo === null ? "#C4B5FD" : "rgba(255,255,255,0.5)" }}>Para mí</button>
                      <button onClick={() => setAssignedTo(partner.id)} style={{ flex: 1, padding: "0.375rem 0.5rem", borderRadius: "10px", border: `1.5px solid ${assignedTo === partner.id ? "#EC4899" : "rgba(255,255,255,0.15)"}`, background: assignedTo === partner.id ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 600, color: assignedTo === partner.id ? "#F9A8D4" : "rgba(255,255,255,0.5)" }}>Para mi pareja 🎁</button>
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: "0.375rem", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dificultad</label>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    {DIFFICULTIES.map((d) => (
                      <button key={d.id} onClick={() => setDifficulty(d.id)} style={{ flex: 1, padding: "0.5rem 0.25rem", borderRadius: "10px", border: `1.5px solid ${difficulty === d.id ? (d.pts === 10 ? "#10B981" : d.pts === 25 ? "#F59E0B" : "#EF4444") : "rgba(255,255,255,0.15)"}`, background: difficulty === d.id ? (d.pts === 10 ? "rgba(16,185,129,0.2)" : d.pts === 25 ? "rgba(245,158,11,0.2)" : "rgba(239,68,68,0.2)") : "rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700, textAlign: "center", color: difficulty === d.id ? "white" : "rgba(255,255,255,0.45)" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "1px", marginBottom: "2px" }}>{Array.from({ length: d.stars }).map((_, i) => <Star key={i} size={8} fill={difficulty === d.id ? "currentColor" : "transparent"} color={difficulty === d.id ? "currentColor" : "rgba(255,255,255,0.3)"} />)}</div>
                        <div>{d.label}</div><div style={{ opacity: 0.8 }}>{d.pts}pts</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.6875rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: "0.375rem", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>Categoría</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    {CATEGORIES.map((c) => (
                      <button key={c.id} onClick={() => setFavCategory(c.id)} style={{ padding: "0.375rem 0.75rem", borderRadius: "999px", border: `1.5px solid ${favCategory === c.id ? c.color : "rgba(255,255,255,0.15)"}`, background: favCategory === c.id ? `${c.color}33` : "rgba(255,255,255,0.06)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.6875rem", fontWeight: 700, color: favCategory === c.id ? "white" : "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s" }}>
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleCreateFavor} disabled={savingFavor || !favTitle.trim()} style={{ padding: "0.75rem", borderRadius: "12px", background: favTitle.trim() && !savingFavor ? `linear-gradient(135deg, ${currentFavCat?.color ?? "#8B5CF6"}, #EC4899)` : "rgba(255,255,255,0.1)", color: "white", border: "none", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", cursor: favTitle.trim() && !savingFavor ? "pointer" : "default" }}>
                  {savingFavor ? "Creando..." : "Crear Favor 💝"}
                </button>
              </div>
            )}

            {/* ── ACTIVE / COMPLETED TABS ── */}
            {(favTab === "active" || favTab === "completed") && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {/* Category filter */}
                <div style={{ display: "flex", gap: "0.375rem", overflowX: "auto", paddingBottom: "2px", scrollbarWidth: "none" }}>
                  <button onClick={() => setFavCategoryFilter("all")} style={{ flexShrink: 0, padding: "0.25rem 0.625rem", borderRadius: "999px", border: `1.5px solid ${favCategoryFilter === "all" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)"}`, background: favCategoryFilter === "all" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700, color: favCategoryFilter === "all" ? "white" : "rgba(255,255,255,0.4)" }}>✨ Todos</button>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setFavCategoryFilter(c.id)} style={{ flexShrink: 0, padding: "0.25rem 0.625rem", borderRadius: "999px", border: `1.5px solid ${favCategoryFilter === c.id ? c.color : "rgba(255,255,255,0.12)"}`, background: favCategoryFilter === c.id ? `${c.color}33` : "rgba(255,255,255,0.05)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700, color: favCategoryFilter === c.id ? "white" : "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", gap: "3px" }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>

                {loadingFavors ? <PhoneLoader /> : (() => {
                  const displayFavors = (favTab === "active" ? activeFavors : completedFavors)
                    .filter(f => favCategoryFilter === "all" || f.category === favCategoryFilter)

                  if (displayFavors.length === 0) return (
                    <div style={{ textAlign: "center", padding: "2rem 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ fontSize: "2.5rem", animation: "bobFlame 2.5s ease-in-out infinite" }}>{favTab === "active" ? "💝" : "🏆"}</div>
                      <p style={{ fontFamily: "'Fredoka', sans-serif", fontWeight: 700, fontSize: "0.9375rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>{favTab === "active" ? "¡Sin favores activos!" : "¡Sin favores hechos aún!"}</p>
                      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>{favTab === "active" ? "Crea vuestro primer favor 💕" : "¡Completa un favor para verlo aquí! ✨"}</p>
                    </div>
                  )

                  return displayFavors.map((f) => {
                    const diff = DIFFICULTIES.find((d) => d.id === f.difficulty)
                    const cat = CATEGORIES.find((c) => c.id === f.category)
                    const diffColor = f.difficulty === "easy" ? "#10B981" : f.difficulty === "medium" ? "#F59E0B" : "#EF4444"
                    const currentUserId = user?.uid ?? ""
                    const partnerId = partner?.id ?? ""
                    const canComplete = !f.assigned_to || f.assigned_to === currentUserId
                    const isExpandingNote = completingFavorId === f.id

                    return (
                      <div key={f.id} style={{ borderRadius: "14px", overflow: "hidden", boxShadow: f.is_completed ? "none" : `0 2px 16px ${cat?.color ?? "#8B5CF6"}22` }}>
                        <div style={{ display: "flex", border: f.is_completed ? "1.5px dashed rgba(255,255,255,0.12)" : `1.5px dashed ${cat?.color ?? "#8B5CF6"}55`, borderRadius: isExpandingNote ? "14px 14px 0 0" : "14px", overflow: "hidden", opacity: f.is_completed ? 0.7 : 1, background: f.is_completed ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.06)" }}>
                          {/* Left panel */}
                          <div style={{ width: 52, flexShrink: 0, background: f.is_completed ? "rgba(255,255,255,0.04)" : `${cat?.color ?? "#8B5CF6"}22`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `1.5px dashed ${cat?.color ?? "rgba(255,255,255,0.15)"}44`, gap: "4px", padding: "0.625rem 0" }}>
                            <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>{cat?.emoji ?? "🎁"}</span>
                            <div style={{ display: "flex", gap: "1px" }}>
                              {Array.from({ length: diff?.stars ?? 1 }).map((_, i) => <Star key={i} size={7} fill={diffColor} color={diffColor} />)}
                            </div>
                          </div>
                          {/* Content */}
                          <div style={{ flex: 1, padding: "0.625rem 0.75rem", minWidth: 0 }}>
                            <h4 style={{ fontWeight: 700, fontSize: "0.875rem", color: "rgba(255,255,255,0.9)", lineHeight: 1.3, margin: "0 0 2px" }}>{f.title}</h4>
                            {f.description && <p style={{ fontSize: "0.625rem", color: "rgba(255,255,255,0.45)", margin: "0 0 0.375rem", lineHeight: 1.4 }}>{f.description}</p>}
                            {!f.is_completed && f.assigned_to && (
                              <div style={{ marginBottom: "0.25rem" }}>
                                {f.assigned_to === currentUserId
                                  ? <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#C4B5FD", background: "rgba(139,92,246,0.2)", padding: "1px 6px", borderRadius: "999px" }}>🎁 Tu pareja te lo regala</span>
                                  : f.assigned_to === partnerId
                                  ? <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: "#F9A8D4", background: "rgba(236,72,153,0.2)", padding: "1px 6px", borderRadius: "999px" }}>🎁 Para tu pareja</span>
                                  : null}
                              </div>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexWrap: "wrap" }}>
                              <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: diffColor, background: `${diffColor}22`, padding: "1px 6px", borderRadius: "999px" }}>{diff?.label} · {diff?.pts}pts</span>
                              {!f.is_completed ? (
                                canComplete ? (
                                  <button onClick={() => { setCompletingFavorId(f.id); setCompletionNote("") }} style={{ marginLeft: "auto", fontSize: "0.625rem", fontWeight: 700, padding: "0.25rem 0.625rem", borderRadius: "999px", border: "none", background: `linear-gradient(135deg, ${cat?.color ?? "#8B5CF6"}, ${cat?.color ?? "#EC4899"})`, color: "white", cursor: "pointer", fontFamily: "inherit" }}>✅ Canjear</button>
                                ) : (
                                  <span style={{ marginLeft: "auto", fontSize: "0.5625rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>Solo tu pareja puede canjear</span>
                                )
                              ) : (
                                <span style={{ marginLeft: "auto", fontSize: "0.5625rem", color: "#6EE7B7", fontWeight: 700 }}>✓ {f.completed_by === user?.uid ? "Tú" : "Pareja"}</span>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteFavor(f.id) }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.25)", padding: "2px", display: "flex" }}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                            {f.is_completed && f.completion_note && (
                              <p style={{ fontSize: "0.5625rem", color: "rgba(255,255,255,0.4)", margin: "0.25rem 0 0", fontStyle: "italic", lineHeight: 1.4 }}>&ldquo;{f.completion_note}&rdquo;</p>
                            )}
                          </div>
                        </div>
                        {/* Completion note expansion */}
                        {isExpandingNote && (
                          <div style={{ border: `1.5px dashed ${cat?.color ?? "#8B5CF6"}44`, borderTop: "none", borderRadius: "0 0 14px 14px", background: "rgba(255,255,255,0.05)", padding: "0.625rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            <p style={{ fontSize: "0.6875rem", fontWeight: 600, color: "rgba(255,255,255,0.55)", margin: 0 }}>¿Quieres añadir una nota?</p>
                            <textarea rows={2} placeholder="Opcional..." value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} maxLength={200} style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1.5px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: "0.75rem", fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} autoFocus />
                            <div style={{ display: "flex", gap: "0.375rem" }}>
                              <button onClick={() => handleCompleteFavor(f.id)} style={{ flex: 1, padding: "0.375rem", borderRadius: "999px", border: "none", background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 600, cursor: "pointer" }}>Sin nota</button>
                              <button onClick={() => handleCompleteFavor(f.id, completionNote)} style={{ flex: 2, padding: "0.375rem", borderRadius: "999px", border: "none", background: `linear-gradient(135deg, ${cat?.color ?? "#8B5CF6"}, #EC4899)`, color: "white", fontFamily: "inherit", fontSize: "0.625rem", fontWeight: 700, cursor: "pointer" }}>Completar ✓</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </PullToRefresh>
        </div>
      )}
    </div>
  )
}
