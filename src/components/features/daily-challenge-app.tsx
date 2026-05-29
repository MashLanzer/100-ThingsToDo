"use client"

import { useState, useMemo } from "react"
import { getFirebaseAuth } from "@/lib/firebase/client"
import { toast } from "sonner"

// ─── Static challenge data (from surpriseTasks.js) ───────────────────────────
interface ChallengeTask {
  emoji: string
  text: string
}

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
  { emoji: "🧺", text: "Preparar un picnic elaborado y buscar un lugar bonito para comer." },
  { emoji: "⭐", text: "Noche de observar las estrellas lejos de la ciudad." },
  { emoji: "🚲", text: "Alquilar bicicletas y recorrer un carril bici o un paseo marítimo." },
  { emoji: "🛶", text: "Alquilar un kayak o una barca de pedales en un lago o en el mar." },
  { emoji: "🏛️", text: "Visitar un museo o una exposición de arte que no conozcáis." },
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
  { emoji: "📵", text: "Tener una tarde 'sin tecnología': móviles apagados." },
  { emoji: "💤", text: "Día de pereza total: desayuno en la cama y películas." },
  { emoji: "🎞️", text: "Ver vuestros vídeos antiguos juntos." },
  { emoji: "💌", text: "Leer cartas o mensajes antiguos que os hayáis enviado." },
  { emoji: "🎶", text: "Escuchar la música que oíais cuando empezasteis a salir." },
  { emoji: "🖼️", text: "Crear un álbum de fotos digital del último año." },
  { emoji: "📍", text: "Visitar el lugar de vuestra primera cita." },
  { emoji: "🪴", text: "Plantar algo juntos: una planta, hierbas aromáticas o un pequeño huerto." },
  { emoji: "🔨", text: "Montar un mueble de IKEA (o similar) juntos." },
  { emoji: "📦", text: "Hacer limpieza profunda de una habitación y donar lo que no usáis." },
  { emoji: "🎨", text: "Pintar una pared de la casa de un color nuevo y atrevido." },
  { emoji: "🖼️", text: "Crear una pared de galería con vuestras fotos y cuadros favoritos." },
  { emoji: "❓", text: "Hacer un test de '36 preguntas para enamorarse'." },
  { emoji: "❤️‍🔥", text: "Hablar sobre vuestros 'lenguajes del amor'." },
  { emoji: "📜", text: "Crear una 'Constitución de la Pareja' con vuestras reglas y valores." },
  { emoji: "💭", text: "Jugar a '¿Qué prefieres?' con preguntas profundas o graciosas." },
  { emoji: "🏆", text: "Crear los 'Premios Anuales de la Pareja'." },
  { emoji: "🐕", text: "Ser voluntario por un día en un refugio de animales." },
  { emoji: "🌳", text: "Participar en una jornada de limpieza de un parque o una playa." },
  { emoji: "🥫", text: "Hacer una compra solidaria para un banco de alimentos." },
  { emoji: "🩸", text: "Ir a donar sangre juntos." },
  { emoji: "🕺", text: "Aprender una coreografía de baile de TikTok o YouTube." },
  { emoji: "🧗", text: "Probar una sesión de iniciación en un rocódromo." },
  { emoji: "🃏", text: "Aprender un truco de magia con cartas." },
  { emoji: "💰", text: "Hacer un curso online gratuito sobre finanzas personales." },
  { emoji: "🗺️", text: "Hacer un tour por vuestra propia ciudad como si fuerais turistas." },
  { emoji: "🍇", text: "Visitar un mercado de agricultores y comprar productos locales." },
  { emoji: "👻", text: "Hacer un 'tour de misterios y leyendas' por vuestra ciudad." },
  { emoji: "🌳", text: "Descubrir un parque o jardín botánico en el que nunca hayáis estado." },
  { emoji: "🏘️", text: "Explorar un barrio diferente de vuestra ciudad." },
  { emoji: "🎬", text: "Noche de cine de un director específico (ej: Tarantino, Miyazaki)." },
  { emoji: "🌮", text: "Noche mexicana: tacos, guacamole y margaritas." },
  { emoji: "🇬🇧", text: "Tarde de té inglesa." },
  { emoji: "📼", text: "Noche de los 90: ver una película de esa década y comer snacks de entonces." },
  { emoji: "🕯️", text: "Cena a la luz de las velas sin electricidad." },
  { emoji: "🥐", text: "Desayunar en una pastelería o cafetería bonita." },
  { emoji: "🍾", text: "Comprar champán/cava solo para celebrar un día normal." },
  { emoji: "👕", text: "Ir de compras y elegir un conjunto de ropa para el otro." },
  { emoji: "💐", text: "Regalarse flores mutuamente el mismo día sin un motivo especial." },
  { emoji: "🍦", text: "Hacer una ruta por las mejores heladerías de la ciudad." },
  { emoji: "👶", text: "Intentar recrear una foto de vuestra infancia." },
  { emoji: "🏡", text: "Buscar casas de ensueño en Idealista/Fotocasa, solo por diversión." },
  { emoji: "🐶", text: "Crear un plan para adoptar una mascota en el futuro." },
  { emoji: "✈️", text: "Planificar un viaje por carretera (road trip)." },
  { emoji: "🎯", text: "Definir 3 metas personales y 3 metas de pareja para el próximo año." },
]

function determineCategory(text: string): string {
  const t = text.toLowerCase()
  if (t.includes("amor") || t.includes("cartas") || t.includes("primera cita") || t.includes("lenguajes del amor"))
    return "romantic"
  if (t.includes("senderismo") || t.includes("kayak") || t.includes("bicicleta") || t.includes("viaje") || t.includes("ruta"))
    return "adventure"
  if (t.includes("spa") || t.includes("yoga") || t.includes("meditación") || t.includes("baño") || t.includes("masaje") || t.includes("pereza"))
    return "chill"
  if (t.includes("pintar") || t.includes("dibujar") || t.includes("crear") || t.includes("escribir") || t.includes("canción") || t.includes("cerámica") || t.includes("fotos"))
    return "creative"
  return "all"
}

const CATEGORIES = [
  { id: "all",      label: "✨ Todos" },
  { id: "romantic", label: "💕 Romántico" },
  { id: "adventure",label: "🗺️ Aventura" },
  { id: "chill",    label: "😌 Relax" },
  { id: "creative", label: "🎨 Creativo" },
]

interface Props { onBack: () => void }

export function DailyChallengeApp({ onBack }: Props) {
  const [category, setCategory] = useState("all")
  const [revealed, setRevealed] = useState(false)
  const [currentChallenge, setCurrentChallenge] = useState<ChallengeTask | null>(null)
  const [history, setHistory] = useState<ChallengeTask[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const filtered = useMemo(
    () => CHALLENGES.filter((c) => category === "all" || determineCategory(c.text) === category),
    [category]
  )

  function pickRandom() {
    const pool = filtered.filter((c) => c.text !== currentChallenge?.text)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setCurrentChallenge(pick)
    setRevealed(true)
    setAccepted(false)
  }

  function handleAccept() {
    if (!currentChallenge) return
    setHistory((h) => [currentChallenge, ...h].slice(0, 10))
    setAccepted(true)
    toast.success("¡Reto aceptado! 🎉")
  }

  async function handleComplete() {
    // Save to DB
    try {
      const auth = getFirebaseAuth()
      const token = await auth.currentUser?.getIdToken()
      if (!token || !currentChallenge) return
      await fetch("/api/challenges/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ challenge_text: currentChallenge.text, category: determineCategory(currentChallenge.text) }),
      })
      toast.success("¡Reto completado! 🏆")
      setRevealed(false)
      setCurrentChallenge(null)
      setAccepted(false)
    } catch {
      toast.error("Error al guardar el reto")
    }
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span>🎲 Reto Diario</span>
      </div>
      <div className="app-content-body">
        {/* Category filters */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCategory(c.id); setRevealed(false); setCurrentChallenge(null) }}
              style={{
                padding: "0.25rem 0.625rem",
                borderRadius: "999px",
                fontSize: "0.6875rem",
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: "pointer",
                border: "none",
                background: category === c.id ? "var(--primary)" : "var(--muted)",
                color: category === c.id ? "white" : "var(--foreground-light)",
                transition: "all 0.15s",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Challenge card */}
        <div
          style={{
            flex: 1,
            background: "white",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "0.75rem",
            minHeight: "160px",
          }}
        >
          {!revealed ? (
            <>
              <div style={{ fontSize: "2rem" }}>❓</div>
              <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)" }}>
                ¿Listos para un nuevo reto?
              </h3>
              <button className="btn btn-primary" style={{ fontSize: "0.875rem" }} onClick={pickRandom}>
                🎲 Descubrir Reto
              </button>
            </>
          ) : currentChallenge && (
            <>
              <div style={{ fontSize: "2.5rem" }}>{currentChallenge.emoji}</div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--foreground)", lineHeight: 1.5 }}>
                {currentChallenge.text}
              </p>
              {accepted && (
                <span style={{ fontSize: "0.75rem", color: "var(--success-dark)", fontWeight: 600 }}>
                  ✅ Reto aceptado
                </span>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {revealed && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-outline"
              style={{ flex: 1, fontSize: "0.8125rem" }}
              onClick={pickRandom}
            >
              Otro Reto
            </button>
            {!accepted ? (
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: "0.8125rem" }}
                onClick={handleAccept}
              >
                ¡Aceptar!
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{ flex: 1, fontSize: "0.8125rem", background: "var(--success-dark)" }}
                onClick={handleComplete}
              >
                ✅ Completar
              </button>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <h3 style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--foreground-light)" }}>
                📜 Retos Recientes
              </h3>
              <button
                onClick={() => setShowHistory((s) => !s)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--primary)" }}
              >
                {showHistory ? "Ocultar" : "Ver"}
              </button>
            </div>
            {showHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "flex-start",
                      fontSize: "0.75rem",
                      color: "var(--foreground-muted)",
                      background: "var(--muted)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.375rem 0.5rem",
                    }}
                  >
                    <span>{h.emoji}</span>
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
