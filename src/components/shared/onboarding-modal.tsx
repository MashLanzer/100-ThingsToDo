"use client"

import { useState } from "react"
import { Heart, ClipboardList, Smartphone, Link2, Sparkles, type LucideProps } from "lucide-react"

const STEPS: { Icon: React.FC<LucideProps>; color: string; title: string; desc: string }[] = [
  {
    Icon: Heart,
    color: "#EC4899",
    title: "¡Bienvenidos a ThingsToDo!",
    desc: "La app de pareja para crear planes, recordar momentos y vivir aventuras juntos.",
  },
  {
    Icon: ClipboardList,
    color: "#8B5CF6",
    title: "Planes y Tareas",
    desc: "Crea listas de cosas que queréis hacer juntos. Marca las tareas al completarlas.",
  },
  {
    Icon: Smartphone,
    color: "#0369a1",
    title: "Apps en el Teléfono",
    desc: "Abre el teléfono kawaii para acceder al diario, música, desafíos, metas y cápsulas del tiempo.",
  },
  {
    Icon: Link2,
    color: "#065F46",
    title: "Conecta con tu Pareja",
    desc: "Comparte tu código desde Ajustes para vincularos y compartir todo automáticamente.",
  },
  {
    Icon: Sparkles,
    color: "#F59E0B",
    title: "¡Todo listo!",
    desc: "Empieza creando vuestro primer plan. ¡Que comience la aventura!",
  },
]

const STORAGE_KEY = "ttd_onboarding_done_v1"

export function useOnboarding() {
  if (typeof window === "undefined") return { shouldShow: false }
  return { shouldShow: !localStorage.getItem(STORAGE_KEY) }
}

export function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1")
    onComplete()
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(45,27,62,0.85)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
    }}>
      <div style={{
        background: "white", borderRadius: "28px",
        boxShadow: "0 24px 80px rgba(139,92,246,0.35)",
        padding: "2.5rem 2rem", maxWidth: "340px", width: "100%", textAlign: "center",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.25rem" }}>
          <current.Icon size={64} color={current.color} />
        </div>
        <h2 style={{
          fontFamily: "'Fredoka', sans-serif", fontSize: "1.375rem", fontWeight: 700,
          color: "#2D1B3E", marginBottom: "0.75rem",
        }}>{current.title}</h2>
        <p style={{ fontSize: "0.9375rem", color: "#6B5B7E", lineHeight: 1.6, marginBottom: "2rem" }}>
          {current.desc}
        </p>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? "20px" : "8px", height: "8px", borderRadius: "999px",
              background: i === step ? "#8B5CF6" : "#E9D5FF",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.625rem", flexDirection: "column" }}>
          {step < STEPS.length - 1 ? (
            <>
              <button
                onClick={() => setStep(s => s + 1)}
                style={{
                  padding: "0.875rem", borderRadius: "999px", border: "none",
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  fontFamily: "'Fredoka', sans-serif", fontSize: "1rem", fontWeight: 700,
                  color: "white", cursor: "pointer",
                }}
              >Siguiente →</button>
              <button onClick={finish} style={{ background: "none", border: "none", color: "#9080a8", fontSize: "0.875rem", cursor: "pointer", padding: "0.5rem" }}>
                Saltar
              </button>
            </>
          ) : (
            <button
              onClick={finish}
              style={{
                padding: "0.875rem", borderRadius: "999px", border: "none",
                background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                fontFamily: "'Fredoka', sans-serif", fontSize: "1.125rem", fontWeight: 700,
                color: "white", cursor: "pointer",
              }}
            >¡Empezar!</button>
          )}
        </div>
      </div>
    </div>
  )
}
