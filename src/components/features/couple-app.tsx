"use client"

import { useState } from "react"
import { useCoupleStatus, useLinkPartner, useUnlinkPartner } from "@/hooks/use-couple"
import { toast } from "sonner"
import { Copy, Check, Heart, Users, Sparkles } from "lucide-react"
import { showConfirm } from "@/lib/confirm"

interface Props { onBack: () => void }

export function CoupleApp({ onBack }: Props) {
  const { data, isLoading } = useCoupleStatus()
  const linkMutation = useLinkPartner()
  const unlinkMutation = useUnlinkPartner()
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)

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
      toast.success("¡Pareja vinculada!")
      setCode("")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al vincular")
    }
  }

  async function handleUnlink() {
    if (!await showConfirm({ title: "Desvincular pareja", message: "Se romperá el vínculo con tu pareja. Podréis volver a vincularos usando el código.", danger: true, confirmLabel: "Desvincular" })) return
    try {
      await unlinkMutation.mutateAsync()
      toast.success("Pareja desvinculada")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  return (
    <>
      <div className="app-content-header">
        <button className="back-btn-phone" onClick={onBack}>‹</button>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Heart size={14} /> Mi Pareja</span>
      </div>
      <div className="app-content-body">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <svg className="animate-heartbeat" width="36" height="36" viewBox="0 0 24 24" fill="#8B5CF6">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        ) : data?.couple ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}><Users size={40} color="var(--primary)" /></div>
            <h3 style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--foreground)", marginBottom: "0.25rem" }}>
              Vinculado con
            </h3>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--primary)", marginBottom: "0.25rem" }}>
              {data.partner?.name ?? "Tu pareja"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "1.25rem" }}>
              {data.partner?.email}
            </p>
            <div style={{
              background: "var(--mint)", borderRadius: "var(--radius-md)", padding: "0.625rem",
              marginBottom: "1.25rem", fontSize: "0.8125rem", color: "#065F46",
            }}>
              <Sparkles size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> ¡Compartiendo planes juntos!
            </div>
            <button
              className="btn btn-outline btn-danger"
              style={{ fontSize: "0.8125rem" }}
              onClick={handleUnlink}
              disabled={unlinkMutation.isPending}
            >
              {unlinkMutation.isPending ? "Desvinculando..." : "Desvincular Pareja"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.25rem" }}>
                Tu Código Único
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "0.625rem" }}>
                Comparte este código con tu pareja
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span className="couple-code" style={{ fontSize: "1.25rem", letterSpacing: "0.2em" }}>
                  {data?.user.couple_code ?? "------"}
                </span>
                <button className="btn-icon-small" onClick={handleCopy} title="Copiar">
                  {copied ? <Check size={15} color="var(--success-dark)" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--foreground-muted)" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ fontSize: "0.75rem" }}>o</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>

            <div>
              <h3 style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--foreground)", marginBottom: "0.25rem" }}>
                Vincular con Pareja
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginBottom: "0.625rem" }}>
                Ingresa el código de tu pareja
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="AB12CD"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, fontSize: "0.875rem" }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleLink}
                  disabled={linkMutation.isPending || code.length !== 6}
                  style={{ flexShrink: 0, fontSize: "0.8125rem" }}
                >
                  {linkMutation.isPending ? "..." : "Vincular"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
