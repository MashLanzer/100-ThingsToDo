"use client"

import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  children: React.ReactNode
  /** "sheet" slides up from bottom (mobile-friendly); "center" is a centered dialog */
  variant?: "sheet" | "center"
  /** Optional footer rendered sticky at the bottom of the modal */
  footer?: React.ReactNode
}

/**
 * Portal-based modal that renders directly into <body>, so it always sits on
 * top of everything (headers, bottom nav, other content) regardless of where
 * it's used in the component tree or any parent stacking context.
 */
export function Modal({ open, onClose, title, children, variant = "sheet", footer }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Lock body scroll + close on Escape while open
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  const isSheet = variant === "sheet"

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(20,10,30,0.55)", backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: isSheet ? "flex-end" : "center",
        justifyContent: "center",
        animation: "fadeIn 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: isSheet ? 520 : 440,
          maxHeight: isSheet ? "92dvh" : "88dvh",
          display: "flex", flexDirection: "column",
          background: "var(--bg)",
          borderRadius: isSheet ? "1.5rem 1.5rem 0 0" : "1.25rem",
          margin: isSheet ? 0 : "1rem",
          boxShadow: "0 -8px 50px rgba(0,0,0,0.28)",
          animation: isSheet
            ? "sheetUp 0.3s cubic-bezier(0.34,1.3,0.64,1)"
            : "modalIn 0.22s cubic-bezier(0.34,1.3,0.64,1)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: isSheet ? "0.875rem 1.25rem 0.5rem" : "1.125rem 1.25rem 0.5rem",
          position: "relative",
        }}>
          {isSheet && (
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 0.875rem" }} />
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
            {title ? (
              <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", fontFamily: "'Fredoka', sans-serif", color: "var(--foreground)", margin: 0 }}>
                {title}
              </h2>
            ) : <span />}
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                border: "none", background: "var(--muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--foreground-muted)",
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch",
          padding: "0.25rem 1.25rem 1.25rem",
        }}>
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div style={{
            flexShrink: 0, padding: "0.875rem 1.25rem calc(0.875rem + env(safe-area-inset-bottom, 0px))",
            borderTop: "1px solid var(--border)", background: "var(--surface)",
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
