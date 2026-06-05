import { NextRequest, NextResponse } from "next/server"

// Static fallback — used when the external API is unavailable
const STATIC_TRUTHS = [
  "¿Cuál es tu recuerdo favorito de nuestra relación?",
  "¿En qué momento supiste que yo era especial para ti?",
  "¿Qué es lo primero que pensaste cuando me viste por primera vez?",
  "¿Qué es lo que más te gusta de mí?",
  "¿Cuál ha sido tu momento más vergonzoso conmigo?",
  "¿Qué es lo que nunca me has contado pero querías hacerlo?",
  "¿Qué canción te recuerda a mí y por qué?",
  "¿Cuál es la cosa más ridícula que has hecho por amor?",
  "¿Si pudieras cambiar algo de nuestra relación, qué sería?",
  "¿Qué sueño tienes que aún no le has contado a nadie?",
  "¿Qué es lo que más te pone nervioso/a de mí?",
  "¿Cuál es el recuerdo de nuestra primera cita que más te hace reír?",
  "¿Qué 3 palabras usarías para describir nuestra relación?",
  "¿Qué cosa te da más vergüenza admitir que te gusta?",
  "¿En qué momento has sido más feliz en tu vida?",
  "¿Qué es lo que más extrañas de tu infancia?",
  "¿Qué es lo que te hace sentir amado/a de verdad?",
  "¿Cuál es tu plan perfecto para una cita romántica?",
  "¿Qué es lo que más te cuesta pedir perdón?",
  "¿Cuál es tu mayor miedo y cómo lo llevas?",
  "¿Qué harías si solo te quedara un día de vida?",
  "¿Qué mensaje me enviarías si supieras que es el último?",
  "¿Si pudieras volver atrás en el tiempo, qué momento vivirías de nuevo?",
  "¿Qué promesa quieres que nos hagamos hoy?",
  "¿En qué momento has sentido más orgullo de ti mismo/a?",
  "¿Qué hábito tuyo crees que a mí más me cuesta tolerar?",
  "¿Qué es lo que más admiras de mí?",
  "¿Hay algo que hayas querido preguntarme y no te hayas atrevido?",
  "¿Cuándo fue la última vez que lloraste y por qué?",
  "¿Qué significa para ti que sigamos juntos dentro de 10 años?",
]

const STATIC_DARES = [
  "Imita la voz de tu pareja durante 1 minuto",
  "Cuéntale a tu pareja algo que nunca le hayas dicho",
  "Da a tu pareja el masaje de espalda más increíble de su vida",
  "Baila una canción romántica durante 30 segundos sin parar",
  "Dibuja un retrato de tu pareja en solo 60 segundos",
  "Di 5 cosas que amas de tu pareja SIN repetirte",
  "Imita a tu pareja haciendo algo cotidiano hasta que adivine qué es",
  "Describe nuestra relación usando solo emojis",
  "Haz una pose de modelo durante 10 segundos sin reírte",
  "Dile algo cursi que normalmente no dirías",
  "Haz la actuación más dramática posible de 'te quiero'",
  "Explica en 60 segundos por qué te enamoraste de tu pareja",
  "Inventa una canción de 30 segundos sobre vuestra historia",
  "Recita un poema improvisado para tu pareja ahora mismo",
  "Muestra la foto más graciosa que tengas en tu teléfono",
  "Habla con acento diferente durante 2 minutos completos",
  "Escribe con el dedo un mensaje secreto en la espalda de tu pareja",
  "Declara tu amor en silencio, solo con gestos, durante 30 segundos",
  "Haz el gesto más ridículo que sepas hacer",
  "Di el alfabeto pero cada letra es una cosa que te gusta de tu pareja",
  "Silba tu canción favorita hasta que tu pareja la adivine",
  "Inventa un nombre para el equipo que formáis los dos y explica por qué",
  "Muestra tu cara de enfado más convincente durante 20 segundos",
  "Confiesa una mentira pequeña que le hayas dicho alguna vez",
  "Dile a tu pareja tres cosas que te gustaría que hiciera más seguido",
  "Enumera 10 cosas que os hagan reír a los dos",
  "Llama a alguien de tu familia y dile que lo quieres de parte de los dos",
  "Crea una frase de amor usando solo palabras de 3 letras",
  "Propón un plan sorpresa para el próximo fin de semana",
  "Cuenta en 1 minuto cómo sería vuestro día perfecto juntos",
]

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "truth"
  const count = Math.min(parseInt(req.nextUrl.searchParams.get("count") ?? "10"), 20)

  // Try external API first — falls back to static if unavailable
  try {
    // truthordaredare.com — free, no key, English
    const category = type === "truth" ? "truth" : "dare"
    const apiUrl = `https://api.truthordaredare.com/api/${category}?limit=${count}`
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(3000) })

    if (res.ok) {
      const data = await res.json()
      // The API returns { result: string[] } or similar — normalise
      const questions: string[] = Array.isArray(data)
        ? data.map((q: { question?: string; text?: string } | string) =>
            typeof q === "string" ? q : (q.question ?? q.text ?? ""))
        : Array.isArray(data?.result)
          ? data.result
          : Array.isArray(data?.questions)
            ? data.questions.map((q: { question?: string; text?: string } | string) =>
                typeof q === "string" ? q : (q.question ?? q.text ?? ""))
            : []

      if (questions.length > 0) {
        return NextResponse.json({ source: "api", questions, type })
      }
    }
  } catch {
    // API unavailable — use fallback below
  }

  // Static fallback
  const pool = type === "truth" ? STATIC_TRUTHS : STATIC_DARES
  const questions = Array.from({ length: count }, () => random(pool))
  return NextResponse.json({ source: "static", questions, type })
}
