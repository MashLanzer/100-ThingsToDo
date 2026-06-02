"use client"

import { useState, useEffect } from "react"
import { getAppLockPin } from "@/lib/app-lock"
import { Loader2 } from "lucide-react"

interface Props {
  onUnlock: () => void
  allowBiometric?: boolean
  onBiometricAttempt?: () => Promise<boolean>  // returns true if success
}

const DIGITS = [1,2,3,4,5,6,7,8,9,undefined,0,"⌫"] as const

export function AppLockScreen({ onUnlock, allowBiometric = false, onBiometricAttempt }: Props) {
  const [input, setInput] = useState("")
  const [shake, setShake] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  // Auto-try biometric on mount
  useEffect(() => {
    if (allowBiometric && onBiometricAttempt) {
      handleBiometric()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBiometric() {
    if (!onBiometricAttempt) return
    setBioLoading(true)
    setErrorMsg("")
    try {
      const ok = await onBiometricAttempt()
      if (ok) onUnlock()
      else setErrorMsg("Biometría cancelada — introduce tu PIN")
    } catch {
      setErrorMsg("Biometría no disponible — introduce tu PIN")
    } finally {
      setBioLoading(false)
    }
  }

  function handleDigit(d: typeof DIGITS[number]) {
    if (d === undefined) return
    if (d === "⌫") {
      setInput(p => p.slice(0,-1))
      setErrorMsg("")
      return
    }
    const next = input + String(d)
    setInput(next)
    if (next.length === 4) {
      const stored = getAppLockPin()
      if (next === stored) {
        onUnlock()
      } else {
        setShake(true)
        setErrorMsg("PIN incorrecto")
        setTimeout(() => { setShake(false); setInput("") }, 700)
      }
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(160deg, var(--primary-lighter, #EDE9FE) 0%, #fce7f3 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem 1.5rem", gap: "1.5rem",
      fontFamily: "'Quicksand', sans-serif",
    }}>
      {/* Lock icon */}
      <div style={{ fontSize: "3rem", lineHeight: 1 }}>🔒</div>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground, #2D1B3E)", margin: 0 }}>
          ThingsToDo
        </h1>
        <p style={{ color: "var(--foreground-muted, #7c6b8a)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {allowBiometric ? "Usa tu huella o introduce el PIN" : "Introduce tu PIN para continuar"}
        </p>
      </div>

      {/* PIN dots */}
      <div style={{
        display: "flex", gap: "1rem",
        animation: shake ? "pinShake 0.5s ease" : undefined,
      }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: i < input.length ? "var(--primary, #8B5CF6)" : "var(--border, #E8E0F0)",
            border: "2px solid var(--primary, #8B5CF6)",
            transition: "background 0.15s",
          }} />
        ))}
      </div>

      {errorMsg && (
        <p style={{ color: "#ef4444", fontSize: "0.8125rem", fontWeight: 600, margin: 0 }}>{errorMsg}</p>
      )}

      {/* Keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", width: "100%", maxWidth: 260 }}>
        {DIGITS.map((d, i) => (
          d === undefined ? <div key={i} /> : (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={bioLoading}
              style={{
                height: 60, borderRadius: "var(--radius-lg, 16px)",
                background: "rgba(255,255,255,0.7)", border: "1.5px solid rgba(139,92,246,0.15)",
                fontSize: d === "⌫" ? "1.25rem" : "1.5rem",
                fontFamily: "'Fredoka', sans-serif", fontWeight: 600,
                color: "var(--foreground, #2D1B3E)", cursor: "pointer",
                transition: "transform 0.1s, background 0.1s",
                backdropFilter: "blur(8px)",
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.93)"; e.currentTarget.style.background = "rgba(139,92,246,0.12)" }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "rgba(255,255,255,0.7)" }}
            >
              {d}
            </button>
          )
        ))}
      </div>

      {/* Biometric retry button */}
      {allowBiometric && !bioLoading && (
        <button
          onClick={handleBiometric}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "2rem", padding: "0.5rem" }}
          title="Usar huella"
        >
          👆
        </button>
      )}
      {bioLoading && <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--primary, #8B5CF6)" }} />}
    </div>
  )
}
