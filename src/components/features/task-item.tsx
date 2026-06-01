"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import type { Task } from "@/types"
import { Trash2, Check, GripVertical, Heart, Flame, Laugh, Star, Zap, AlertTriangle, Calendar, CheckCircle2, Sparkles, Edit2 } from "lucide-react"
import { KawaiiIcon } from "@/components/ui/kawaii-icon"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { getFirebaseAuth } from "@/lib/firebase/client"

const REACTIONS: Array<{ key: string; icon: React.ReactNode; label: string }> = [
  { key: "heart", icon: <Heart  size={13} />, label: "Me encanta" },
  { key: "fire",  icon: <Flame  size={13} />, label: "¡Fuego!"    },
  { key: "star",  icon: <Star   size={13} />, label: "¡Genial!"   },
  { key: "laugh", icon: <Laugh  size={13} />, label: "¡Jajaja!"   },
  { key: "zap",   icon: <Zap    size={13} />, label: "¡Vamos!"    },
]
const REACTION_KEYS = REACTIONS.map((r) => r.key)
const REACTION_ICON_MAP: Record<string, React.ReactNode> = Object.fromEntries(REACTIONS.map((r) => [r.key, r.icon]))

interface Reaction { id: string; emoji: string; user_id: string; user_name?: string | null }
interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onEdit?: () => void
  currentUserId?: string
}

async function authFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  })
  if (!res.ok) return null
  return res.json()
}

export function TaskItem({ task, onToggle, onDelete, onEdit, currentUserId }: Props) {
  const [popping, setPopping] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [reactLoading, setReactLoading] = useState(false)

  // Refs for swipe (non-passive listeners needed for preventDefault)
  const swipeContainerRef = useRef<HTMLDivElement>(null)
  const swipeXRef = useRef(0)  // mirror of swipeX for use inside event listeners

  // Ref for long-press timer
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const dndStyle = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  // ── Reactions ─────────────────────────────────────────────────
  const fetchReactions = useCallback(async () => {
    const data = await authFetch(`/api/tasks/${task.id}/reactions`)
    if (Array.isArray(data)) setReactions(data)
  }, [task.id])

  useEffect(() => {
    fetchReactions()
    const interval = setInterval(fetchReactions, 30_000)
    return () => clearInterval(interval)
  }, [fetchReactions])

  async function handleReact(key: string) {
    if (reactLoading) return
    setReactLoading(true)
    // Optimistic toggle
    const mine = reactions.some((r) => r.emoji === key && r.user_id === currentUserId)
    setReactions((prev) =>
      mine
        ? prev.filter((r) => !(r.emoji === key && r.user_id === currentUserId))
        : [...prev, { id: "tmp", emoji: key, user_id: currentUserId ?? "", user_name: null }]
    )
    try {
      await authFetch(`/api/tasks/${task.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ emoji: key }),
      })
      await fetchReactions()
    } catch {
      await fetchReactions() // revert on error
    } finally {
      setReactLoading(false)
      setShowPicker(false)
    }
  }

  // Group reactions by key
  const reactionGroups = REACTION_KEYS.reduce<Record<string, { count: number; mine: boolean }>>((acc, key) => {
    const group = reactions.filter((r) => r.emoji === key)
    if (group.length > 0) acc[key] = { count: group.length, mine: group.some((r) => r.user_id === currentUserId) }
    return acc
  }, {})

  // ── Toggle with sound/haptic ──────────────────────────────────
  function handleToggle() {
    if (!task.completed) {
      setPopping(true); setSparkle(true)
      setTimeout(() => setPopping(false), 400)
      setTimeout(() => setSparkle(false), 700)
      try {
        const raw = localStorage.getItem("ttd_settings_v1")
        const s = raw ? JSON.parse(raw) : {}
        if (s.vibrationEnabled !== false) navigator.vibrate?.(50)
        if (s.soundEnabled !== false) {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
          const osc = ctx.createOscillator(); const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(660, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
          gain.gain.setValueAtTime(0.18, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35)
        }
      } catch { /* ignore */ }
    }
    onToggle()
  }

  // ── Swipe-to-delete via non-passive touch listeners ───────────
  useEffect(() => {
    const el = swipeContainerRef.current
    if (!el) return

    let startX = 0
    let startY = 0
    let directionLocked = false
    let isHorizontal = false
    let isSwiping = false

    function onTouchStart(e: TouchEvent) {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      directionLocked = false
      isHorizontal = false
      isSwiping = false
    }

    function onTouchMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      // Lock direction on first significant movement
      if (!directionLocked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        isHorizontal = Math.abs(dx) > Math.abs(dy)
        directionLocked = true
      }
      if (!directionLocked) return

      if (isHorizontal) {
        e.preventDefault() // Prevent page scroll during horizontal swipe
        isSwiping = true
        const newX = swipeXRef.current + dx - (isSwiping ? 0 : 0)
        const clamped = Math.max(-80, Math.min(0, newX < 0 ? newX : swipeXRef.current + dx))
        if (dx < 0 || swipeXRef.current < 0) {
          const target = swipeXRef.current === -80
            ? Math.min(0, -80 + (dx > 0 ? dx : 0))
            : Math.max(-80, dx < 0 ? dx : 0)
          swipeXRef.current = clamped
          setSwipeX(clamped)
        }
      }
    }

    function onTouchEnd() {
      if (!isHorizontal) return
      if (swipeXRef.current < -40) {
        swipeXRef.current = -80
        setSwipeX(-80)
      } else {
        swipeXRef.current = 0
        setSwipeX(0)
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd, { passive: true })
    el.addEventListener("touchcancel", onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
      el.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [])

  // Keep ref in sync with state
  useEffect(() => { swipeXRef.current = swipeX }, [swipeX])

  // ── Long-press to edit (on title area only) ───────────────────
  function startLongPress() {
    if (!onEdit) return
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      navigator.vibrate?.(40)
      onEdit()
    }, 520)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  return (
    <div ref={setNodeRef} style={{ ...dndStyle, position: "relative", marginBottom: "0.5rem" }}>
      {/* Outer clip wrapper — swipe touch handlers live here */}
      <div
        ref={swipeContainerRef}
        style={{ position: "relative", borderRadius: "var(--radius-lg)", overflow: "hidden" }}
      >
        {/* Red delete panel (revealed on swipe) */}
        <div
          style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
            background: "#ef4444", display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer",
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { onDelete(); swipeXRef.current = 0; setSwipeX(0) }}
        >
          <Trash2 size={20} color="white" />
        </div>

        {/* Sliding content */}
        <div
          className={`task-item animate-fade-in ${task.completed ? "completed" : ""}`}
          style={{
            transform: `translateX(${swipeX}px)`,
            transition: "transform 0.22s ease",
            marginBottom: 0,
          }}
          onClick={() => { if (swipeX < -10) { swipeXRef.current = 0; setSwipeX(0) } }}
        >
          {/* Drag handle */}
          {!task.completed && (
            <div
              {...attributes}
              {...listeners}
              style={{ cursor: "grab", padding: "4px 2px", color: "var(--border)", display: "flex", alignItems: "center", touchAction: "none", flexShrink: 0 }}
              title="Arrastrar para reordenar"
            >
              <GripVertical size={16} />
            </div>
          )}

          {/* Checkbox */}
          <button
            className={`task-checkbox ${task.completed ? "checked" : ""} ${popping ? "animate-task-pop" : ""}`}
            onClick={(e) => {
              e.stopPropagation()
              if (swipeX < -10) { swipeXRef.current = 0; setSwipeX(0); return }
              if (!longPressTriggered.current) handleToggle()
            }}
            title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
            style={{ position: "relative", flexShrink: 0 }}
          >
            {task.completed && <Check size={13} color="white" strokeWidth={3} />}
            {sparkle && (
              <span className="animate-sparkle" style={{ top: "-8px", left: "50%", transform: "translateX(-50%)", display: "flex" }}>
                <Sparkles size={12} />
              </span>
            )}
          </button>

          {/* Icon bubble */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: task.completed
              ? "linear-gradient(135deg, var(--primary), var(--secondary))"
              : "var(--primary-lighter)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <KawaiiIcon name={task.icon} size={18} color={task.completed ? "white" : "var(--primary)"} />
          </div>

          {/* Title — long-press target */}
          <span
            className="task-title"
            style={{
              flex: 1, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)",
              textDecoration: task.completed ? "line-through" : "none",
              opacity: task.completed ? 0.6 : 1,
              userSelect: "none", WebkitUserSelect: "none",
            }}
            onPointerDown={() => startLongPress()}
            onPointerUp={() => cancelLongPress()}
            onPointerCancel={() => cancelLongPress()}
            onPointerMove={() => cancelLongPress()}
          >
            {task.title}
            {task.completed && task.completed_by_name && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, textDecoration: "none" }}>
                <CheckCircle2 size={10} style={{ flexShrink: 0 }} /> {task.completed_by_name}
              </span>
            )}
            {task.notes && (
              <span style={{ display: "block", fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, marginTop: 1 }}>
                {task.notes}
              </span>
            )}
            {task.due_date && (() => {
              const today = new Date().toISOString().split("T")[0]
              const diffDays = Math.ceil((new Date(task.due_date).getTime() - new Date(today).getTime()) / 86_400_000)
              let badge: React.ReactNode
              if (task.due_date < today)
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "#fef2f2", color: "#dc2626", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><AlertTriangle size={9} /> Vencida</span>
              else if (task.due_date === today)
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "#fff7ed", color: "#ea580c", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><Calendar size={9} /> Hoy</span>
              else if (diffDays <= 3)
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "#fefce8", color: "#ca8a04", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><Calendar size={9} /> En {diffDays} días</span>
              else {
                const [, m, d] = task.due_date.split("-")
                badge = <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: "0.5625rem", background: "var(--muted)", color: "var(--foreground-muted)", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 2, textDecoration: "none" }}><Calendar size={9} /> {d}/{m}</span>
              }
              return <span style={{ display: "block" }}>{badge}</span>
            })()}
          </span>

          {/* Edit button */}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", color: "var(--foreground-muted)", lineHeight: 1, flexShrink: 0, display: "flex", alignItems: "center" }}
              title="Editar (o mantén presionado el texto)"
            >
              <Edit2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Reactions row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", paddingLeft: "0.5rem", paddingBottom: "0.25rem", flexWrap: "wrap", background: "var(--surface)" }}>
        {Object.entries(reactionGroups).map(([key, { count, mine }]) => (
          <button
            key={key}
            onClick={() => handleReact(key)}
            disabled={reactLoading}
            style={{
              background: mine ? "var(--primary-lighter)" : "var(--muted)",
              border: mine ? "1px solid var(--primary)" : "1px solid var(--border)",
              borderRadius: 20, padding: "2px 8px", fontSize: "0.7rem",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 3,
              color: mine ? "var(--primary)" : "var(--foreground-muted)", transition: "transform 0.1s",
            }}
            title={mine ? "Quitar reacción" : "Reaccionar"}
          >
            {REACTION_ICON_MAP[key]}
            <span style={{ fontSize: "0.65rem", fontWeight: 700 }}>{count}</span>
          </button>
        ))}

        {/* + picker (Sparkles button) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowPicker((v) => !v)}
            style={{
              background: "var(--muted)", border: "1px solid var(--border)",
              borderRadius: 20, padding: "2px 8px", fontSize: "0.7rem",
              cursor: "pointer", color: "var(--foreground-muted)", lineHeight: 1.4,
              display: "flex", alignItems: "center",
            }}
            title="Añadir reacción"
          >
            <Sparkles size={11} />
          </button>
          {showPicker && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: 0,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "8px 10px",
              display: "flex", gap: 4, zIndex: 50,
              boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
            }}>
              {REACTIONS.map(({ key, icon, label }) => (
                <button
                  key={key}
                  onClick={() => handleReact(key)}
                  disabled={reactLoading}
                  title={label}
                  style={{
                    background: reactions.some((r) => r.emoji === key && r.user_id === currentUserId)
                      ? "var(--primary-lighter)" : "var(--muted)",
                    border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "var(--radius-md)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: reactions.some((r) => r.emoji === key && r.user_id === currentUserId)
                      ? "var(--primary)" : "var(--foreground-muted)",
                    transition: "transform 0.1s, background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
