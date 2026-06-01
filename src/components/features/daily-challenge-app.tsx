"use client"

import { useState, useMemo, useEffect } from "react"
import { getFirebaseToken } from "@/lib/firebase/client"
import { toast } from "sonner"
import { RefreshCw, CheckCircle, Trophy } from "lucide-react"

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
  { emoji: "🎲", text: "Noche de juegos de mesa con apuestas divertidas." },
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
  { emoji: "📦", text: "Hacer limpieza profunda y donar lo que no usáis." },
  { emoji: "🎨", text: "Pintar una pared de la casa de un color nuevo y atrevido." },
  { emoji: "🖼️", text: "Crear una pared de galería con vuestras fotos favoritas." },
  { emoji: "❓", text: "Hacer el test de '36 preguntas para enamorarse'." },
  { emoji: "❤️‍🔥", text: "Hablar sobre vuestros 'lenguajes del amor'." },
  { emoji: "📜", text: "Crear una 'Constitución de la Pareja' con vuestras reglas." },
  { emoji: "💭", text: "Jugar a '¿Qué prefieres?' con preguntas profundas o graciosas." },
  { emoji: "🏆", text: "Crear los 'Premios Anuales de la Pareja'." },
  { emoji: "🐕", text: "Ser voluntario por un día en un refugio de animales." },
  { emoji: "🌳", text: "Participar en una jornada de limpieza de un parque o playa." },
  { emoji: "🥫", text: "Hacer una compra solidaria para un banco de alimentos." },
  { emoji: "🩸", text: "Ir a donar sangre juntos." },
  { emoji: "🕺", text: "Aprender una coreografía de baile de TikTok o YouTube." },
  { emoji: "🧗", text: "Probar una sesión de iniciación en un rocódromo." },
  { emoji: "🃏", text: "Aprender un truco de magia con cartas." },
  { emoji: "💰", text: "Hacer un curso online gratuito sobre finanzas personales." },
  { emoji: "🗺️", text: "Hacer un tour por vuestra ciudad como si fuerais turistas." },
  { emoji: "🍇", text: "Visitar un mercado de agricultores y comprar productos locales." },
  { emoji: "👻", text: "Hacer un 'tour de misterios y leyendas' por vuestra ciudad." },
  { emoji: "🌳", text: "Descubrir un parque botánico en el que nunca hayáis estado." },
  { emoji: "🏘️", text: "Explorar un barrio diferente de vuestra ciudad." },
  { emoji: "🎬", text: "Noche de cine de un director específico (Tarantino, Miyazaki…)." },
  { emoji: "🌮", text: "Noche mexicana: tacos, guacamole y margaritas." },
  { emoji: "🇬🇧", text: "Tarde de té inglesa." },
  { emoji: "📼", text: "Noche de los 90: película de esa época y snacks de entonces." },
  { emoji: "🕯️", text: "Cena a la luz de las velas sin electricidad." },
  { emoji: "🥐", text: "Desayunar en una pastelería o cafetería bonita." },
  { emoji: "🍾", text: "Comprar champán/cava solo para celebrar un día normal." },
  { emoji: "👕", text: "Ir de compras y elegir un conjunto de ropa para el otro." },
  { emoji: "💐", text: "Regalarse flores mutuamente sin un motivo especial." },
  { emoji: "🍦", text: "Hacer una ruta por las mejores heladerías de la ciudad." },
  { emoji: "👶", text: "Intentar recrear una foto de vuestra infancia." },
  { emoji: "🏡", text: "Buscar casas de ensueño en Idealista, solo por diversión." },
  { emoji: "🐶", text: "Crear un plan para adoptar una mascota en el futuro." },
  { emoji: "✈️", text: "Planificar un viaje por carretera (road trip)." },
  { emoji: "🎯", text: "Definir 3 metas personales y 3 de pareja para el próximo año." },
]

function getCategory(text: string) {
  const t = text.toLowerCase()
  if (t.includes("amor") || t.includes("cartas") || t.includes("primera cita") || t.includes("lenguajes"))
    return "romantic"
  if (t.includes("senderismo") || t.includes("kayak") || t.includes("bicicleta") || t.includes("viaje") || t.includes("ruta") || t.includes("turistas"))
    return "adventure"
  if (t.includes("spa") || t.includes("yoga") || t.includes("meditación") || t.includes("baño") || t.includes("masaje") || t.includes("pereza"))
    return "chill"
  if (t.includes("pintar") || t.includes("escribir") || t.includes("canción") || t.includes("cerámica") || t.includes("fotos") || t.includes("collage"))
    return "creative"
  return "all"
}

const CATS = [
  { id: "all",       label: "✨ Todos",     bg: "#8B5CF6" },
  { id: "romantic",  label: "💕 Romántico", bg: "#EC4899" },
  { id: "adventure", label: "🗺️ Aventura",  bg: "#F59E0B" },
  { id: "chill",     label: "😌 Relax",     bg: "#10B981" },
  { id: "creative",  label: "🎨 Creativo",  bg: "#3B82F6" },
]

const CAT_COLORS: Record<string, { from: string; to: string }> = {
  all:       { from: "#8B5CF6", to: "#EC4899" },
  romantic:  { from: "#EC4899", to: "#F472B6" },
  adventure: { from: "#F59E0B", to: "#EF4444" },
  chill:     { from: "#10B981", to: "#3B82F6" },
  creative:  { from: "#3B82F6", to: "#8B5CF6" },
}

interface DbChallenge {
  id: string
  challenge_text: string
  category: string
  is_completed: boolean
  accepted_by: string
}

export function DailyChallengeApp({ onBack }: { onBack: () => void }) {
  const [category, setCategory] = useState("all")
  const [challenge, setChallenge] = useState<ChallengeTask | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [history, setHistory] = useState<ChallengeTask[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dbChallenge, setDbChallenge] = useState<DbChallenge | null>(null)
  const [loadingDb, setLoadingDb] = useState(true)

  const filtered = useMemo(
    () => CHALLENGES.filter((c) => category === "all" || getCategory(c.text) === category),
    [category]
  )

  const catColor = CAT_COLORS[category] ?? CAT_COLORS.all

  useEffect(() => {
    loadActiveChallenge()
  }, [])

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(loadActiveChallenge, 30_000)
    return () => clearInterval(t)
  }, [])

  async function loadActiveChallenge() {
    setLoadingDb(true)
    try {
      const token = await getFirebaseToken()
      if (!token) { setLoadingDb(false); return }
      const res = await fetch("/api/challenges/daily", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        // API returns { today: ..., history: [...] }
        const todayChallenge = data?.today
        if (todayChallenge && todayChallenge.challenge_text) {
          setDbChallenge(todayChallenge)
          // Find the matching challenge in our list
          const found = CHALLENGES.find((c) => c.text === todayChallenge.challenge_text)
          if (found) {
            setChallenge(found)
            setAccepted(!todayChallenge.is_completed)
            setCompleted(todayChallenge.is_completed)
          }
        }
      }
    } catch { /* silently fail */ } finally { setLoadingDb(false) }
  }

  async function postChallengeToServer(c: ChallengeTask) {
    try {
      const token = await getFirebaseToken()
      if (!token) return
      await fetch("/api/challenges/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challenge_text: c.text, category: getCategory(c.text) }),
      })
    } catch { /* silently fail */ }
  }

  function pickRandom() {
    const pool = filtered.filter((c) => c.text !== challenge?.text)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setChallenge(pick)
    setAccepted(false)
    setCompleted(false)
    setDbChallenge(null)
  }

  function handleAccept() {
    if (!challenge) return
    setHistory((h) => [challenge, ...h].slice(0, 10))
    setAccepted(true)
    toast.success("¡Reto aceptado! 🎉")
    postChallengeToServer(challenge)
  }

  async function handleComplete() {
    if (!challenge || saving) return
    setSaving(true)
    try {
      const token = await getFirebaseToken()
      if (token) {
        if (dbChallenge?.id) {
          // Mark the existing DB challenge as completed via PATCH
          await fetch("/api/challenges/daily", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: dbChallenge.id }),
          })
        } else {
          // No DB record yet, just save as completed
          await fetch("/api/challenges/daily", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ challenge_text: challenge.text, category: getCategory(challenge.text) }),
          })
        }
      }
      setCompleted(true)
      toast.success("¡Reto completado! 🏆 ¡Sois los mejores!")
    } catch {
      toast.error("Error al guardar")
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>🎲 Reto Diario</span>
        <button
          onClick={loadActiveChallenge}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", padding: "4px", display: "flex", marginLeft: "auto" }}
          title="Actualizar"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="app-content-body" style={{ gap: "0.75rem", padding: "0.75rem" }}>
        {/* Category chips */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); if (!dbChallenge) { setChallenge(null); setAccepted(false); setCompleted(false) } }}
              style={{
                padding: "0.25rem 0.625rem", borderRadius: "999px",
                fontSize: "0.6875rem", fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer", border: "none",
                background: category === c.id ? c.bg : "#f0ebfa",
                color: category === c.id ? "white" : "#7C3AED",
                transition: "all 0.15s",
              }}
            >{c.label}</button>
          ))}
        </div>

        {loadingDb ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--foreground-muted)", fontSize: "0.875rem" }}>
            Cargando...
          </div>
        ) : (
          <>
            {/* Challenge card */}
            {!challenge ? (
              /* ── Idle state ─────────────────────────────────── */
              <div style={{
                background: `linear-gradient(135deg, ${catColor.from}22, ${catColor.to}22)`,
                border: `2px dashed ${catColor.from}66`,
                borderRadius: "20px",
                padding: "2rem 1.25rem",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: "0.875rem", textAlign: "center",
              }}>
                <div style={{ fontSize: "3rem", lineHeight: 1 }}>🎁</div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "1rem", color: "#2D1B3E", marginBottom: "0.25rem", fontFamily: "'Fredoka', sans-serif" }}>
                    ¿Listos para un nuevo reto?
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#6B5B7E" }}>
                    {filtered.length} retos disponibles en esta categoría
                  </p>
                </div>
                <button
                  onClick={pickRandom}
                  style={{
                    padding: "0.75rem 1.5rem", borderRadius: "999px", border: "none",
                    background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`,
                    color: "white", fontFamily: "'Fredoka', sans-serif",
                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                    boxShadow: `0 6px 20px ${catColor.from}55`,
                  }}
                >
                  🎲 ¡Descubrir Reto!
                </button>
              </div>
            ) : (
              /* ── Revealed state ──────────────────────────────── */
              <div style={{
                background: completed
                  ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)"
                  : `linear-gradient(135deg, ${catColor.from}18, ${catColor.to}18)`,
                border: `2px solid ${completed ? "#10B981" : catColor.from}`,
                borderRadius: "20px",
                padding: "1.5rem 1.25rem",
                display: "flex", flexDirection: "column",
                alignItems: "center", gap: "1rem", textAlign: "center",
              }}>
                {/* Big emoji */}
                <div style={{
                  width: "72px", height: "72px", borderRadius: "50%",
                  background: `linear-gradient(135deg, ${catColor.from}33, ${catColor.to}33)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "2.25rem", lineHeight: 1,
                  border: `2px solid ${catColor.from}44`,
                }}>
                  {completed ? "🏆" : challenge.emoji}
                </div>

                {/* Challenge text — ALWAYS visible */}
                <p style={{
                  fontSize: "0.9375rem",
                  fontWeight: 700,
                  color: "#2D1B3E",
                  lineHeight: 1.55,
                  margin: 0,
                  fontFamily: "'Fredoka', sans-serif",
                }}>
                  {challenge.text}
                </p>

                {/* Status badge */}
                {completed && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    background: "#10B98122", borderRadius: "999px",
                    padding: "0.375rem 0.875rem",
                    fontSize: "0.8125rem", fontWeight: 700, color: "#065F46",
                  }}>
                    <Trophy size={14} /> ¡Reto completado! ¡Sois geniales!
                  </div>
                )}
                {accepted && !completed && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    background: "#8B5CF622", borderRadius: "999px",
                    padding: "0.375rem 0.875rem",
                    fontSize: "0.8125rem", fontWeight: 700, color: "#5B21B6",
                  }}>
                    <CheckCircle size={14} /> Reto aceptado · ¡A por ello!
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            {challenge && !completed && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={pickRandom}
                  style={{
                    flex: 1, padding: "0.75rem", borderRadius: "12px",
                    border: "2px solid #E9D5FF", background: "white",
                    fontFamily: "inherit", fontSize: "0.875rem", fontWeight: 700,
                    color: "#7C3AED", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
                  }}
                >
                  <RefreshCw size={15} /> Otro
                </button>
                {!accepted ? (
                  <button
                    onClick={handleAccept}
                    style={{
                      flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none",
                      background: `linear-gradient(135deg, ${catColor.from}, ${catColor.to})`,
                      fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                      color: "white", cursor: "pointer",
                      boxShadow: `0 4px 16px ${catColor.from}44`,
                    }}
                  >
                    ✅ ¡Aceptar Reto!
                  </button>
                ) : (
                  <button
                    onClick={handleComplete}
                    disabled={saving}
                    style={{
                      flex: 2, padding: "0.75rem", borderRadius: "12px", border: "none",
                      background: "linear-gradient(135deg, #10B981, #059669)",
                      fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                      color: "white", cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.7 : 1,
                      boxShadow: "0 4px 16px #10B98144",
                    }}
                  >
                    {saving ? "..." : "🏆 ¡Completado!"}
                  </button>
                )}
              </div>
            )}

            {/* New challenge after completion */}
            {completed && (
              <button
                onClick={pickRandom}
                style={{
                  width: "100%", padding: "0.75rem", borderRadius: "12px", border: "none",
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                  color: "white", cursor: "pointer",
                }}
              >
                🎲 Nuevo Reto
              </button>
            )}

            {/* History */}
            {history.length > 0 && (
              <div>
                <button
                  onClick={() => setShowHistory((s) => !s)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", background: "none", border: "none", cursor: "pointer",
                    padding: "0.25rem 0", marginBottom: showHistory ? "0.5rem" : 0,
                  }}
                >
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6B5B7E" }}>📜 Retos recientes ({history.length})</span>
                  <span style={{ fontSize: "0.75rem", color: "#8B5CF6", fontWeight: 600 }}>{showHistory ? "▲ Ocultar" : "▼ Ver"}</span>
                </button>
                {showHistory && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    {history.map((h, i) => (
                      <div key={i} style={{
                        display: "flex", gap: "0.625rem", alignItems: "flex-start",
                        padding: "0.625rem 0.75rem",
                        background: "white", borderRadius: "10px",
                        border: "1px solid #E9D5FF",
                      }}>
                        <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{h.emoji}</span>
                        <span style={{ fontSize: "0.75rem", color: "#2D1B3E", lineHeight: 1.4 }}>{h.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
