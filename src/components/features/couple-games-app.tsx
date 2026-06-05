"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft } from "lucide-react"

// ── Static game data ────────────────────────────────────────────────────────

const VERDADES: string[] = [
  "¿Cuál es tu recuerdo favorito de nuestra relación hasta ahora?",
  "¿En qué momento supiste que yo era especial para ti?",
  "¿Qué es lo primero que pensaste cuando me viste por primera vez?",
  "¿Qué es lo que más te gusta de mí?",
  "¿Cuál ha sido tu momento más vergonzoso conmigo?",
  "¿Qué es lo que nunca me has contado pero querías hacerlo?",
  "¿Qué canción te recuerda a mí y por qué?",
  "¿Cuál es la cosa más ridícula que has hecho por amor?",
  "¿Si pudieras cambiar algo de nuestra relación, qué sería?",
  "¿Qué complido tuyo me ha gustado más hasta ahora?",
  "¿Qué sueño tienes que aún no le has contado a nadie?",
  "¿Qué es lo que más te pone nervioso/a de mí?",
  "¿Qué 3 palabras usarías para describir nuestra relación?",
  "¿Qué cosa te da más vergüenza admitir que te gusta?",
  "¿En qué momento has sido más feliz en tu vida?",
  "¿Qué es lo que más extrañas de tu infancia?",
  "¿Si pudieras vivir en cualquier ciudad del mundo, cuál elegirías y por qué?",
  "¿Qué es lo que te hace sentir amado/a de verdad?",
  "¿Cuál es tu plan perfecto para una cita romántica?",
  "¿Cuál es el recuerdo de nuestra primera cita que más te hace reír?",
  "¿Qué superpower elegirías si pudieras tener uno?",
  "¿En qué momento has sentido más orgullo de ti mismo/a?",
  "¿Qué persona (además de mí) ha marcado más tu vida?",
  "¿Cuál es tu peor manía o hábito?",
  "¿Qué mensaje me enviarías si supieras que es el último?",
  "¿Si pudieras volver atrás en el tiempo, qué momento vivirías de nuevo?",
  "¿Qué promesa quieres que nos hagamos hoy?",
  "¿Qué es lo que más te cuesta pedir perdón?",
  "¿Cuál es tu mayor miedo y cómo lo llevas?",
  "¿Qué harías si solo te quedara un día de vida?",
  "¿Qué película o serie me recomendarías para entenderme mejor?",
  "¿Cuál es tu tipo de vejez ideal?",
  "¿Qué es lo que más te tranquiliza cuando estás estresado/a?",
  "¿Qué harías con un millón de euros?",
  "¿Cuál es tu mayor arrepentimiento?",
  "¿Cuándo fue la última vez que lloraste y por qué?",
  "¿Qué hábito tuyo crees que a mí más me cuesta tolerar?",
  "¿Qué es lo que más admiras de mí?",
  "¿Hay algo que hayas querido preguntarme y no te hayas atrevido?",
  "¿Qué significa para ti que sigamos juntos dentro de 10 años?",
]

const RETOS: string[] = [
  "Imita la voz de tu pareja durante 1 minuto",
  "Cuéntale a tu pareja algo que nunca le hayas dicho",
  "Da a tu pareja el masaje de espalda más increíble de su vida",
  "Envíale un audio muy dramático a alguien de tu familia diciéndoles que los quieres",
  "Baila una canción romántica durante 30 segundos sin parar",
  "Dibuja un retrato de tu pareja en solo 60 segundos",
  "Di 5 cosas que amas de tu pareja SIN repetirte",
  "Imita a tu pareja haciendo algo cotidiano hasta que adivine qué es",
  "Describe nuestra relación usando solo emojis",
  "Cuéntale la historia de cómo os conocisteis con todos los detalles dramáticos",
  "Haz una pose de modelo durante 10 segundos sin reírte",
  "Dile algo cursi que normalmente no dirías",
  "Pon una canción que os represente como pareja y explica por qué la elegiste",
  "Crea una frase de amor usando solo palabras de 3 letras",
  "Haz la actuación más dramática posible de 'te quiero'",
  "Explica en 60 segundos por qué te enamoraste de tu pareja",
  "Inventa una canción de 30 segundos sobre vuestra historia",
  "Recita un poema improvisado para tu pareja ahora mismo",
  "Muestra la foto más graciosa que tengas en tu teléfono",
  "Habla con acento diferente durante 2 minutos completos",
  "Cuenta un chiste que te sepa mal pero sin reírte",
  "Escribe con el dedo un mensaje secreto en la espalda de tu pareja",
  "Haz la voz del personaje de tu película favorita",
  "Declara tu amor en silencio, solo con gestos, durante 30 segundos",
  "Haz el gesto más ridículo que sepas hacer",
  "Comparte el meme más gracioso que tengas guardado",
  "Propón un plan sorpresa para el próximo fin de semana",
  "Cuenta en 1 minuto cómo sería vuestro día perfecto juntos",
  "Llama a alguien de tu familia y dile 'os queremos mucho' de parte de los dos",
  "Di el alfabeto pero cada letra es una cosa que te gusta de tu pareja",
  "Silba tu canción favorita hasta que tu pareja la adivine",
  "Inventa un nombre para el equipo que formáis los dos y explica por qué",
  "Haz 10 flexiones o sentadillas. Sí, ahora",
  "Muestra tu cara de enfado más convincente durante 20 segundos",
  "Di 3 cosas que harías diferente si tuvieras que enamorarte de cero",
  "Imita a un famoso/a que le guste a tu pareja",
  "Confiesa una mentira pequeña que le hayas dicho alguna vez",
  "Dile a tu pareja tres cosas que te gustaría que hiciera más seguido",
  "Haz una foto artística de lo que tengas más cerca ahora mismo",
  "Enumera 10 cosas que os hagan reír a los dos",
]

interface Dilemma { a: string; b: string }
const QUE_PREFIERES: Dilemma[] = [
  { a: "Vivir en la ciudad", b: "Vivir en el campo" },
  { a: "Ser famoso/a sin dinero", b: "Ser rico/a pero anónimo/a" },
  { a: "Viaje a la playa", b: "Viaje a la montaña" },
  { a: "Netflix toda la noche", b: "Cenar fuera y pasear" },
  { a: "Desayuno romántico en casa", b: "Brunch en un café bonito" },
  { a: "Fin de semana solos", b: "Fin de semana con amigos" },
  { a: "Saber el futuro", b: "Poder cambiar el pasado" },
  { a: "Hablar por teléfono", b: "Chatear por mensajes" },
  { a: "Frío con buena ropa", b: "Calor en verano" },
  { a: "Película de terror", b: "Película romántica" },
  { a: "Cocinar en casa", b: "Pedir a domicilio" },
  { a: "Madrugar y disfrutar la mañana", b: "Trasnochar y dormir hasta tarde" },
  { a: "Muchos amigos conocidos", b: "Pocos amigos muy íntimos" },
  { a: "Viajar mucho con lo justo", b: "Viajar poco pero con lujo" },
  { a: "Recordarlo todo perfectamente", b: "Olvidar fácilmente lo malo" },
  { a: "Verano perfecto en el Caribe", b: "Invierno mágico en el norte de Europa" },
  { a: "Vivir 100 años con salud normal", b: "Vivir 70 años con salud perfecta" },
  { a: "Sorpresa romántica inesperada", b: "Cita planificada y especial" },
  { a: "Perder el teléfono", b: "Perder la cartera" },
  { a: "Un abrazo largo sin decir nada", b: "Una conversación profunda de horas" },
  { a: "Canción lenta y romántica", b: "Canción movida y alegre" },
  { a: "Primera cita en cine", b: "Primera cita en restaurante" },
  { a: "Tener mascota juntos", b: "Sin mascotas pero viajar más" },
  { a: "Boda pequeña e íntima", b: "Boda grande con toda la familia" },
  { a: "Leer libros", b: "Ver documentales" },
  { a: "Conocer el futuro de vuestra relación", b: "No saber nada y vivirlo juntos" },
  { a: "Dormir con la ventana abierta", b: "Cuarto muy caliente y cerrado" },
  { a: "Ganar la pelea pero perder la razón", b: "Tener razón pero perder la pelea" },
  { a: "Comprar regalos pensados con tiempo", b: "Hacer un regalo sorpresa espontáneo" },
  { a: "Mudarte al extranjero juntos", b: "Quedarse en vuestra ciudad siempre" },
]

const PREGUNTAS_36 = [
  // Set 1
  { set: 1 as const, text: "Si pudieras elegir a cualquier persona en el mundo como invitado a cenar, ¿a quién elegirías?" },
  { set: 1 as const, text: "¿Te gustaría ser famoso/a? ¿De qué manera?" },
  { set: 1 as const, text: "Antes de hacer una llamada telefónica, ¿ensayas lo que vas a decir? ¿Por qué?" },
  { set: 1 as const, text: "¿Cómo sería para ti un día perfecto?" },
  { set: 1 as const, text: "¿Cuándo fue la última vez que cantaste para ti mismo/a? ¿Y para alguien más?" },
  { set: 1 as const, text: "Si pudieras vivir hasta los 90 años manteniendo la mente o el cuerpo de los 30 durante los últimos 60 años, ¿qué elegirías?" },
  { set: 1 as const, text: "¿Tienes una corazonada secreta sobre cómo vas a morir?" },
  { set: 1 as const, text: "Nombra tres cosas que tú y yo tengamos en común" },
  { set: 1 as const, text: "¿Por qué estás más agradecido/a en tu vida?" },
  { set: 1 as const, text: "Si pudieras cambiar algo de la forma en que te criaron, ¿qué sería?" },
  { set: 1 as const, text: "Cuéntame tu historia de vida con el mayor detalle posible en cuatro minutos" },
  { set: 1 as const, text: "Si pudieras despertar mañana habiendo ganado cualquier cualidad o habilidad, ¿cuál sería?" },
  // Set 2
  { set: 2 as const, text: "Si una bola de cristal te dijera la verdad sobre ti mismo/a, tu vida o el futuro, ¿qué querrías saber?" },
  { set: 2 as const, text: "¿Hay algo que hayas soñado hacer durante mucho tiempo? ¿Por qué no lo has hecho?" },
  { set: 2 as const, text: "¿Cuál es el mayor logro de tu vida?" },
  { set: 2 as const, text: "¿Qué valoras más en una amistad?" },
  { set: 2 as const, text: "¿Cuál es tu recuerdo más preciado?" },
  { set: 2 as const, text: "¿Cuál es tu recuerdo más doloroso?" },
  { set: 2 as const, text: "Si supieras que en un año vas a morir repentinamente, ¿cambiarías algo en tu vida? ¿Por qué?" },
  { set: 2 as const, text: "¿Qué significa la amistad para ti?" },
  { set: 2 as const, text: "¿Qué papel juegan el amor y el afecto en tu vida?" },
  { set: 2 as const, text: "Alternad compartiendo cinco características positivas de vuestra pareja" },
  { set: 2 as const, text: "¿Qué tan cálida y amorosa es tu familia? ¿Crees que tu infancia fue más feliz que la de la mayoría?" },
  { set: 2 as const, text: "¿Cómo te sientes con respecto a tu relación con tu madre?" },
  // Set 3
  { set: 3 as const, text: "Haz tres afirmaciones verídicas del tipo 'nosotros dos...'" },
  { set: 3 as const, text: "Completa esta frase: 'Ojalá tuviera alguien con quien compartir...'" },
  { set: 3 as const, text: "Si fueras a ser amigo/a íntimo/a de tu pareja, ¿qué sería importante que supiera de ti?" },
  { set: 3 as const, text: "Cuéntale a tu pareja lo que más te gusta de él/ella. Sé muy honesto/a." },
  { set: 3 as const, text: "Comparte con tu pareja un momento embarazoso de tu vida" },
  { set: 3 as const, text: "¿Cuándo fue la última vez que lloraste delante de alguien? ¿Y solo/a?" },
  { set: 3 as const, text: "Cuéntale a tu pareja algo que ya te guste de él/ella" },
  { set: 3 as const, text: "¿Hay algo que sea demasiado serio como para bromear?" },
  { set: 3 as const, text: "Si fueras a morir esta noche sin poder comunicarte con nadie, ¿qué lamentarías no haber dicho? ¿Por qué no lo has dicho todavía?" },
  { set: 3 as const, text: "Tu casa está en llamas. Después de salvar a tus seres queridos, tienes tiempo de salvar solo una cosa material. ¿Qué sería y por qué?" },
  { set: 3 as const, text: "De todas las personas de tu familia, ¿cuya pérdida te resultaría más difícil? ¿Por qué?" },
  { set: 3 as const, text: "Comparte un problema personal y pide consejo a tu pareja. Cuéntale también cómo te sientes al respecto." },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { onBack: () => void }
type View = "home" | "verdad-reto" | "prefieres" | "36-preguntas"
type VorMode = "verdad" | "reto"

const MODES = [
  { id: "verdad-reto" as View,   emoji: "🎴", name: "Verdad o Reto",    desc: "Preguntas íntimas y retos divertidos", color: "#7c3aed" },
  { id: "prefieres" as View,     emoji: "⚖️", name: "¿Qué prefieres?",  desc: "Dilemas para conocerse mejor",         color: "#0369a1" },
  { id: "36-preguntas" as View,  emoji: "💬", name: "36 Preguntas",     desc: "El estudio que une corazones",         color: "#b45309" },
]

export function CoupleGamesApp({ onBack }: Props) {
  const [view, setView] = useState<View>("home")

  // — Verdad o Reto —
  const [vorMode, setVorMode] = useState<VorMode>("verdad")
  const [verdades, setVerdades] = useState<string[]>([])
  const [retos, setRetos] = useState<string[]>([])
  const [vIdx, setVIdx] = useState(0)
  const [rIdx, setRIdx] = useState(0)
  const [vorFlipped, setVorFlipped] = useState(false)

  // — ¿Qué prefieres? —
  const [dilemmas, setDilemmas] = useState<Dilemma[]>([])
  const [dIdx, setDIdx] = useState(0)
  const [dChoice, setDChoice] = useState<"a" | "b" | null>(null)

  // — 36 Preguntas —
  const [q36Idx, setQ36Idx] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("games_36_idx") ?? "0", 10)
    }
    return 0
  })

  const enterGame = useCallback((v: View) => {
    if (v === "verdad-reto") {
      setVerdades(shuffled(VERDADES))
      setRetos(shuffled(RETOS))
      setVIdx(0); setRIdx(0)
      setVorMode("verdad"); setVorFlipped(false)
    } else if (v === "prefieres") {
      setDilemmas(shuffled(QUE_PREFIERES))
      setDIdx(0); setDChoice(null)
    }
    setView(v)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("games_36_idx", String(q36Idx))
    }
  }, [q36Idx])

  // — Derived —
  const currentVerdad = verdades[vIdx % Math.max(verdades.length, 1)]
  const currentReto   = retos[rIdx % Math.max(retos.length, 1)]
  const currentCard   = vorMode === "verdad" ? currentVerdad : currentReto
  const currentDilemma = dilemmas[dIdx] ?? QUE_PREFIERES[0]
  const currentQ36    = PREGUNTAS_36[Math.min(q36Idx, PREGUNTAS_36.length - 1)]
  const q36Progress   = Math.min(q36Idx + 1, 36)
  const q36Set        = currentQ36?.set ?? 1

  // ── Render helpers ────────────────────────────────────────────────────────

  const chipStyle = (active: boolean, color: string) => ({
    padding: "0.4rem 1rem", borderRadius: "999px", border: `2px solid ${active ? color : "var(--border)"}`,
    background: active ? color : "transparent", color: active ? "white" : "var(--foreground-muted)",
    fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s ease",
  } as React.CSSProperties)

  const backBtn = (label: string) => (
    <button
      onClick={() => setView("home")}
      style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontWeight: 600, fontSize: "0.8125rem", padding: "0.25rem 0", fontFamily: "inherit", marginBottom: "0.75rem" }}
    >
      <ChevronLeft size={16} /> {label}
    </button>
  )

  // ── Views ─────────────────────────────────────────────────────────────────

  if (view === "home") {
    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", cursor: "pointer", color: "var(--foreground-muted)", fontWeight: 600, fontSize: "0.8125rem", padding: "0.25rem 0", fontFamily: "inherit", marginBottom: "0.5rem" }}>
          <ChevronLeft size={16} /> Inicio
        </button>
        <h2 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
          🎮 Juegos de Pareja
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "1.25rem" }}>
          Para conectar, reír y conocerse más
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => enterGame(m.id)}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "1rem 1.125rem", borderRadius: "16px",
                background: `linear-gradient(135deg, ${m.color}18 0%, ${m.color}08 100%)`,
                border: `1.5px solid ${m.color}30`,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "transform 0.12s ease, box-shadow 0.12s ease",
              }}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1, flexShrink: 0 }}>{m.emoji}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", margin: 0 }}>{m.name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", margin: 0, marginTop: "0.125rem" }}>{m.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Verdad o Reto ─────────────────────────────────────────────────────────

  if (view === "verdad-reto") {
    const isVerdad = vorMode === "verdad"
    const cardBg = isVerdad
      ? "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
      : "linear-gradient(135deg, #ea580c 0%, #f97316 100%)"

    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {backBtn("Juegos")}
        <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0, marginBottom: "0.875rem" }}>
          🎴 Verdad o Reto
        </h3>

        {/* Mode selector */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button style={chipStyle(isVerdad, "#7c3aed")} onClick={() => { setVorMode("verdad"); setVorFlipped(false) }}>
            💬 Verdad
          </button>
          <button style={chipStyle(!isVerdad, "#ea580c")} onClick={() => { setVorMode("reto"); setVorFlipped(false) }}>
            🎯 Reto
          </button>
        </div>

        {/* Card */}
        <div style={{
          flex: 1, borderRadius: "20px", background: cardBg, padding: "1.5rem",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", marginBottom: "1rem", position: "relative", overflow: "hidden",
        }}>
          <div aria-hidden style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <div aria-hidden style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <p style={{ fontSize: "2.5rem", marginBottom: "1rem", lineHeight: 1 }}>
            {isVerdad ? "💬" : "🎯"}
          </p>
          <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "rgba(255,255,255,0.75)", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {isVerdad ? "Verdad" : "Reto"}
          </p>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "white", textAlign: "center", lineHeight: 1.45, position: "relative", zIndex: 1 }}>
            {currentCard}
          </p>
        </div>

        {/* Next button */}
        <button
          onClick={() => {
            if (isVerdad) setVIdx(i => (i + 1) % verdades.length)
            else setRIdx(i => (i + 1) % retos.length)
          }}
          style={{
            padding: "0.75rem", borderRadius: "14px", border: "none", cursor: "pointer",
            background: isVerdad ? "#7c3aed" : "#ea580c", color: "white",
            fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          Siguiente →
        </button>
      </div>
    )
  }

  // ── ¿Qué prefieres? ───────────────────────────────────────────────────────

  if (view === "prefieres") {
    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {backBtn("Juegos")}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            ⚖️ ¿Qué prefieres?
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 600 }}>
            {dIdx + 1} / {dilemmas.length}
          </span>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "1rem" }}>
          Cada uno elige en voz alta. ¡Sin pensar mucho!
        </p>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          {(["a", "b"] as const).map((opt) => {
            const selected = dChoice === opt
            const text = opt === "a" ? currentDilemma.a : currentDilemma.b
            const label = opt === "a" ? "A" : "B"
            const color = opt === "a" ? "#0369a1" : "#7c3aed"
            return (
              <button
                key={opt}
                onClick={() => setDChoice(opt)}
                style={{
                  flex: 1, padding: "1rem", borderRadius: "16px", border: `2px solid ${selected ? color : "var(--border)"}`,
                  background: selected ? `${color}15` : "var(--card)",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  transition: "all 0.15s ease",
                  boxShadow: selected ? `0 4px 16px ${color}25` : "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: "50%", background: selected ? color : "var(--border)",
                  color: selected ? "white" : "var(--foreground-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: "0.875rem", flexShrink: 0,
                  transition: "all 0.15s ease",
                }}>
                  {label}
                </span>
                <span style={{ fontWeight: 600, fontSize: "0.875rem", color: selected ? color : "var(--foreground)", lineHeight: 1.35 }}>
                  {text}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => { setDIdx(i => (i + 1) % dilemmas.length); setDChoice(null) }}
          style={{
            padding: "0.75rem", borderRadius: "14px", border: "none", cursor: "pointer",
            background: "#0369a1", color: "white",
            fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          Siguiente →
        </button>
      </div>
    )
  }

  // ── 36 Preguntas ──────────────────────────────────────────────────────────

  if (view === "36-preguntas") {
    const finished = q36Idx >= PREGUNTAS_36.length
    const setColors: Record<number, string> = { 1: "#b45309", 2: "#0369a1", 3: "#7c3aed" }
    const setColor = setColors[q36Set] ?? "#b45309"
    const setLabel = `Ronda ${q36Set} de 3`

    return (
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {backBtn("Juegos")}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>
            💬 36 Preguntas
          </h3>
          {!finished && (
            <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", fontWeight: 600 }}>
              {q36Progress} / 36
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, borderRadius: "999px", background: "var(--border)", overflow: "hidden", marginBottom: "0.875rem" }}>
          <div style={{ height: "100%", width: `${(q36Progress / 36) * 100}%`, borderRadius: "999px", background: setColor, transition: "width 0.3s ease" }} />
        </div>

        {finished ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "3rem" }}>🎉</span>
            <h3 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.25rem", fontWeight: 700, color: "var(--foreground)", margin: 0, textAlign: "center" }}>
              ¡Habéis completado las 36 preguntas!
            </h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", textAlign: "center", margin: 0 }}>
              Según el estudio, responder juntos estas preguntas fortalece el vínculo de pareja. ¡Enhorabuena!
            </p>
            <button
              onClick={() => setQ36Idx(0)}
              style={{ marginTop: "0.5rem", padding: "0.625rem 1.25rem", borderRadius: "12px", border: "none", cursor: "pointer", background: "#7c3aed", color: "white", fontWeight: 700, fontSize: "0.875rem", fontFamily: "inherit" }}
            >
              Empezar de nuevo
            </button>
          </div>
        ) : (
          <>
            <div style={{
              flex: 1, borderRadius: "20px", padding: "1.25rem",
              background: `linear-gradient(135deg, ${setColor}18 0%, ${setColor}08 100%)`,
              border: `1.5px solid ${setColor}30`,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              marginBottom: "1rem",
            }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: setColor, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {setLabel}
              </span>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.5, margin: "1rem 0" }}>
                {currentQ36.text}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "var(--foreground-muted)", margin: 0 }}>
                Turnarse para responder. Tomad vuestro tiempo.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {q36Idx > 0 && (
                <button
                  onClick={() => setQ36Idx(i => i - 1)}
                  style={{ padding: "0.75rem", borderRadius: "14px", border: "1.5px solid var(--border)", cursor: "pointer", background: "var(--card)", color: "var(--foreground)", fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit", flex: "0 0 auto" }}
                >
                  ←
                </button>
              )}
              <button
                onClick={() => setQ36Idx(i => Math.min(i + 1, PREGUNTAS_36.length))}
                style={{
                  flex: 1, padding: "0.75rem", borderRadius: "14px", border: "none", cursor: "pointer",
                  background: setColor, color: "white",
                  fontWeight: 700, fontSize: "0.9375rem", fontFamily: "inherit",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                }}
              >
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return null
}
