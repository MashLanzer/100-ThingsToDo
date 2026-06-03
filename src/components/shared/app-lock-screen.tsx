"use client"

import { useState, useEffect } from "react"
import { getAppLockPin } from "@/lib/app-lock"
import { getCachedCouplePhoto } from "@/lib/couple-photo"
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
  const [couplePhoto, setCouplePhoto] = useState<string | null>(null)

  // Load the cached couple photo to use as the lock-screen backdrop
  useEffect(() => {
    setCouplePhoto(getCachedCouplePhoto())
  }, [])

  // Auto-try biometric on mount
  useEffect(() => {
    if (allowBiometric && onBiometricAttempt) {
      handleBiometric()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasPhoto = !!couplePhoto
  // On a photo backdrop we switch to light text and translucent dark keys so
  // everything stays legible over any image.
  const titleColor = hasPhoto ? "#ffffff" : "var(--foreground, #2D1B3E)"
  const subColor = hasPhoto ? "rgba(255,255,255,0.85)" : "var(--foreground-muted, #7c6b8a)"

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

  const keyBg = hasPhoto ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.7)"
  const keyBgActive = hasPhoto ? "rgba(255,255,255,0.32)" : "rgba(139,92,246,0.12)"
  const keyColor = hasPhoto ? "#ffffff" : "var(--foreground, #2D1B3E)"
  const keyBorder = hasPhoto ? "1.5px solid rgba(255,255,255,0.25)" : "1.5px solid rgba(139,92,246,0.15)"

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: hasPhoto
        ? `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.65) 100%), center / cover no-repeat url("${couplePhoto}")`
        : "linear-gradient(160deg, var(--primary-lighter, #EDE9FE) 0%, #fce7f3 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "2rem 1.5rem", gap: "1.5rem",
      fontFamily: "'Quicksand', sans-serif",
    }}>
      {/* Lock icon */}
      <div style={{ fontSize: "3rem", lineHeight: 1, filter: hasPhoto ? "drop-shadow(0 2px 8px rgba(0,0,0,0.5))" : undefined }}>🔒</div>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.5rem", fontWeight: 700, color: titleColor, margin: 0, textShadow: hasPhoto ? "0 2px 12px rgba(0,0,0,0.6)" : undefined }}>
          ThingsToDo
        </h1>
        <p style={{ color: subColor, fontSize: "0.875rem", marginTop: "0.25rem", textShadow: hasPhoto ? "0 1px 8px rgba(0,0,0,0.6)" : undefined }}>
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
            background: i < input.length
              ? (hasPhoto ? "#ffffff" : "var(--primary, #8B5CF6)")
              : (hasPhoto ? "rgba(255,255,255,0.25)" : "var(--border, #E8E0F0)"),
            border: hasPhoto ? "2px solid rgba(255,255,255,0.8)" : "2px solid var(--primary, #8B5CF6)",
            transition: "background 0.15s",
          }} />
        ))}
      </div>

      {errorMsg && (
        <p style={{ color: hasPhoto ? "#fecaca" : "#ef4444", fontSize: "0.8125rem", fontWeight: 600, margin: 0, textShadow: hasPhoto ? "0 1px 8px rgba(0,0,0,0.6)" : undefined }}>{errorMsg}</p>
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
                background: keyBg, border: keyBorder,
                fontSize: d === "⌫" ? "1.25rem" : "1.5rem",
                fontFamily: "'Fredoka', sans-serif", fontWeight: 600,
                color: keyColor, cursor: "pointer",
                transition: "transform 0.1s, background 0.1s",
                backdropFilter: "blur(8px)",
              }}
              onTouchStart={(e) => { e.currentTarget.style.transform = "scale(0.93)"; e.currentTarget.style.background = keyBgActive }}
              onTouchEnd={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = keyBg }}
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
