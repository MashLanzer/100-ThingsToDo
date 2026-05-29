"use client"

import { useState } from "react"
import { useAppStore } from "@/stores/app-store"
import { useCoupleStatus, useLinkPartner, useUnlinkPartner } from "@/hooks/use-couple"
import { toast } from "sonner"
import { X, Copy, Check } from "lucide-react"

export function CoupleModal() {
  const { showCoupleModal, closeCoupleModal } = useAppStore()
  const { data, isLoading } = useCoupleStatus()
  const linkMutation = useLinkPartner()
  const unlinkMutation = useUnlinkPartner()
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)

  if (!showCoupleModal) return null

  async function handleCopy() {
    if (!data?.user.couple_code) return
    await navigator.clipboard.writeText(data.user.couple_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLink() {
    if (code.trim().length !== 6) {
      toast.error("El código debe tener 6 caracteres")
      return
    }
    try {
      await linkMutation.mutateAsync(code.trim().toUpperCase())
      toast.success("¡Pareja vinculada exitosamente! 💕")
      setCode("")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al vincular")
    }
  }

  async function handleUnlink() {
    if (!confirm("¿Seguro que quieres desvincular a tu pareja?")) return
    try {
      await unlinkMutation.mutateAsync()
      toast.success("Pareja desvinculada")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al desvincular")
    }
  }

  return (
    <div className="modal-overlay-bg" onClick={closeCoupleModal}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">💕 Gestionar Pareja</h2>
          <button className="btn-icon" onClick={closeCoupleModal}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <svg className="animate-heartbeat" width="40" height="40" viewBox="0 0 24 24" fill="#8B5CF6">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
          ) : data?.couple ? (
            // Linked view
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>💏</div>
              <h3 style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                Vinculado con
              </h3>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>
                {data.partner?.name ?? "Tu pareja"}
              </p>
              <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "1.5rem" }}>
                {data.partner?.email}
              </p>
              <div
                style={{
                  background: "var(--mint)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  marginBottom: "1.5rem",
                  fontSize: "0.875rem",
                  color: "#065F46",
                }}
              >
                ✨ ¡Ahora pueden compartir planes y tareas juntos!
              </div>
              <button
                className="btn btn-outline btn-danger"
                onClick={handleUnlink}
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? "Desvinculando..." : "Desvincular Pareja"}
              </button>
            </div>
          ) : (
            // Unlinked view
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* My code */}
              <div>
                <h3 style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                  Tu Código Único
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "0.75rem" }}>
                  Comparte este código con tu pareja para vincular sus cuentas
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className="couple-code">{data?.user.couple_code ?? "------"}</span>
                  <button className="btn-icon-small" onClick={handleCopy} title="Copiar código">
                    {copied ? <Check size={16} color="var(--success-dark)" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "var(--foreground-muted)" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                <span style={{ fontSize: "0.8125rem" }}>o</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>

              {/* Enter partner code */}
              <div>
                <h3 style={{ fontWeight: 700, color: "var(--foreground)", marginBottom: "0.25rem" }}>
                  Vincular con Pareja
                </h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--foreground-muted)", marginBottom: "0.75rem" }}>
                  Ingresa el código de tu pareja para compartir planes
                </p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ej: AB12CD"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700 }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleLink}
                    disabled={linkMutation.isPending || code.length !== 6}
                    style={{ flexShrink: 0 }}
                  >
                    {linkMutation.isPending ? "..." : "Vincular"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <span style={{ fontSize: "0.75rem", color: "var(--foreground-muted)" }}>
            ThingsToDo Kawaii Edition v1.0 — Hecho con 💕 por MashLanzer
          </span>
        </div>
      </div>
    </div>
  )
}
