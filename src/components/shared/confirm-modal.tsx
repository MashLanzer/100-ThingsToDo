"use client"

import { useState, useCallback, useEffect } from "react"
import { X, AlertTriangle, Trash2 } from "lucide-react"
import { registerConfirm, type ConfirmOptions } from "@/lib/confirm"

interface State {
  open: boolean
  opts: ConfirmOptions
  resolve: (v: boolean) => void
}

const DEFAULT_STATE: State = {
  open: false,
  opts: { title: "" },
  resolve: () => {},
}

export function ConfirmModal() {
  const [state, setState] = useState<State>(DEFAULT_STATE)
  const [closing, setClosing] = useState(false)

  const show = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, opts, resolve })
      setClosing(false)
    })
  }, [])

  useEffect(() => {
    registerConfirm(show)
  }, [show])

  function close(result: boolean) {
    setClosing(true)
    setTimeout(() => {
      state.resolve(result)
      setState(DEFAULT_STATE)
      setClosing(false)
    }, 180)
  }

  if (!state.open) return null

  const isDanger = state.opts.danger !== false
  const emoji = state.opts.emoji ?? (isDanger ? "🗑️" : "💬")
  const confirmLabel = state.opts.confirmLabel ?? (isDanger ? "Eliminar" : "Confirmar")
  const cancelLabel = state.opts.cancelLabel ?? "Cancelar"

  return (
    <div
      onClick={() => close(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(15,10,25,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 env(safe-area-inset-bottom, 16px)",
        animation: closing ? "overlayOut 0.18s ease forwards" : "overlayIn 0.18s ease forwards",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "440px",
          background: "var(--surface)",
          borderRadius: "var(--radius-xl, 20px) var(--radius-xl, 20px) 0 0",
          overflow: "hidden",
          animation: closing ? "sheetOut 0.18s ease forwards" : "sheetIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
        }}
      >
        {/* Gradient header */}
        <div style={{
          background: isDanger
            ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
          padding: "1.125rem 1.25rem 1rem",
          display: "flex", alignItems: "center", gap: "0.75rem",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.25rem", flexShrink: 0,
          }}>
            {isDanger ? <Trash2 size={18} color="white" /> : <AlertTriangle size={18} color="white" />}
          </div>
          <h2 style={{
            fontFamily: "'Fredoka', sans-serif", fontWeight: 700,
            fontSize: "1.0625rem", color: "white", flex: 1,
          }}>
            {state.opts.title}
          </h2>
          <button
            onClick={() => close(false)}
            style={{
              background: "rgba(255,255,255,0.18)", border: "none", borderRadius: "50%",
              width: 30, height: 30, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <X size={14} color="white" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.125rem 1.25rem 1.5rem" }}>
          {state.opts.message && (
            <p style={{
              fontSize: "0.9rem", color: "var(--foreground-light)",
              lineHeight: 1.55, marginBottom: "1.25rem",
            }}>
              {state.opts.message}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.625rem" }}>
            <button
              className="btn btn-outline"
              onClick={() => close(false)}
              style={{ flex: 1 }}
            >
              {cancelLabel}
            </button>
            <button
              className="btn"
              onClick={() => close(true)}
              style={{
                flex: 1,
                background: isDanger
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                color: "white",
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes overlayIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes overlayOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes sheetIn    { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes sheetOut   { from { transform: translateY(0) } to { transform: translateY(100%) } }
      `}</style>
    </div>
  )
}
