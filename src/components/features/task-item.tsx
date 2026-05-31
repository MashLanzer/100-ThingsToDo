"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { KAWAII_ICONS } from "@/types"
import type { Task } from "@/types"
import { Trash2, Check, Heart, Flame, Star, Laugh, Zap, Sparkles } from "lucide-react"
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

interface Reaction { id: string; emoji: string; user_id: string }

interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onEdit?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
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

export function TaskItem({ task, onToggle, onDelete, onEdit, onMoveUp, onMoveDown }: Props) {
  const emoji = KAWAII_ICONS[task.icon] ?? task.icon
  const [popping, setPopping] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number>(0)

  // Reactions state
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [reactLoading, setReactLoading] = useState(false)
  const [myUid, setMyUid] = useState("")

  useEffect(() => {
    getFirebaseAuth().onAuthStateChanged((u) => { if (u) setMyUid(u.uid) })
  }, [])

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
    const mine = reactions.some((r) => r.emoji === key && r.user_id === myUid)
    setReactions((prev) =>
      mine
        ? prev.filter((r) => !(r.emoji === key && r.user_id === myUid))
        : [...prev, { id: "tmp", emoji: key, user_id: myUid }]
    )
    try {
      await authFetch(`/api/tasks/${task.id}/reactions`, { method: "POST", body: JSON.stringify({ emoji: key }) })
      await fetchReactions()
    } catch {
      await fetchReactions()
    } finally {
      setReactLoading(false)
      setShowPicker(false)
    }
  }

  // Group reactions by key
  const reactionGroups = REACTION_KEYS.reduce<Record<string, { count: number; mine: boolean }>>((acc, key) => {
    const group = reactions.filter((r) => r.emoji === key)
    if (group.length > 0) acc[key] = { count: group.length, mine: group.some((r) => r.user_id === myUid) }
    return acc
  }, {})

  function handleToggle() {
    if (!task.completed) {
      setPopping(true)
      setSparkle(true)
      setTimeout(() => setPopping(false), 400)
      setTimeout(() => setSparkle(false), 700)
      try {
        const raw = localStorage.getItem("ttd_settings_v1")
        const s = raw ? JSON.parse(raw) : {}
        if (s.vibrationEnabled !== false) navigator.vibrate?.(50)
        if (s.soundEnabled !== false) {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
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

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < 0) {
      setSwipeX(Math.max(delta, -80))
    } else {
      setSwipeX(0)
    }
  }

  function handleTouchEnd() {
    setIsSwiping(false)
    if (swipeX < -50) {
      setSwipeX(-80)
    } else {
      setSwipeX(0)
    }
  }

  return (
    <div style={{ position: "relative", marginBottom: "0.5rem", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
      {/* Red delete panel behind */}
      <div
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
          background: "#ef4444", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer",
        }}
        onClick={() => { onDelete(); setSwipeX(0) }}
      >
        <Trash2 size={20} color="white" />
      </div>

      {/* Sliding content */}
      <div
        className={`task-item animate-fade-in ${task.completed ? "completed" : ""}`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s ease",
          marginBottom: 0,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (swipeX < -10) { setSwipeX(0) } }}
      >
        {/* Checkbox */}
        <button
          className={`task-checkbox ${task.completed ? "checked" : ""} ${popping ? "animate-task-pop" : ""}`}
          onClick={(e) => { e.stopPropagation(); if (swipeX < -10) { setSwipeX(0); return }; handleToggle() }}
          title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
          style={{ position: "relative", flexShrink: 0 }}
        >
          {task.completed && <Check size={13} color="white" strokeWidth={3} />}
          {sparkle && (
            <span className="animate-sparkle" style={{ top: "-8px", left: "50%", transform: "translateX(-50%)", display: "flex" }}>
              ✨
            </span>
          )}
        </button>

        {/* Icon bubble */}
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
          background: task.completed
            ? "linear-gradient(135deg, var(--primary), var(--secondary))"
            : "var(--primary-lighter)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.125rem",
        }}>
          {emoji}
        </div>

        {/* Title */}
        <span
          className="task-title"
          style={{
            flex: 1, fontSize: "0.9rem", fontWeight: 600, color: "var(--foreground)",
            textDecoration: task.completed ? "line-through" : "none",
            opacity: task.completed ? 0.6 : 1,
          }}
        >
          {task.title}
          {task.completed && task.completed_by_name && (
            <span style={{ display: "block", fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, textDecoration: "none" }}>
              ✅ {task.completed_by_name}
            </span>
          )}
          {task.notes && (
            <span style={{ display: "block", fontSize: "0.625rem", color: "var(--foreground-muted)", fontWeight: 400, marginTop: "1px" }}>
              {task.notes}
            </span>
          )}
          {task.due_date && (() => {
            const today = new Date().toISOString().split("T")[0]
            const diffDays = Math.ceil((new Date(task.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
            let badge: React.ReactNode
            if (task.due_date < today) {
              badge = <span style={{ display: "inline-block", fontSize: "0.5625rem", background: "#fef2f2", color: "#dc2626", borderRadius: "4px", padding: "1px 5px", fontWeight: 600, marginTop: "2px", textDecoration: "none" }}>⚠️ Vencida</span>
            } else if (task.due_date === today) {
              badge = <span style={{ display: "inline-block", fontSize: "0.5625rem", background: "#fff7ed", color: "#ea580c", borderRadius: "4px", padding: "1px 5px", fontWeight: 600, marginTop: "2px", textDecoration: "none" }}>📅 Hoy</span>
            } else if (diffDays <= 3) {
              badge = <span style={{ display: "inline-block", fontSize: "0.5625rem", background: "#fefce8", color: "#ca8a04", borderRadius: "4px", padding: "1px 5px", fontWeight: 600, marginTop: "2px", textDecoration: "none" }}>📅 En {diffDays} días</span>
            } else {
              const [, m, d] = task.due_date.split("-")
              badge = <span style={{ display: "inline-block", fontSize: "0.5625rem", background: "var(--muted)", color: "var(--foreground-muted)", borderRadius: "4px", padding: "1px 5px", fontWeight: 600, marginTop: "2px", textDecoration: "none" }}>📅 {d}/{m}</span>
            }
            return <span style={{ display: "block" }}>{badge}</span>
          })()}
        </span>

        {/* Right-side actions */}
        {(onEdit || onMoveUp || onMoveDown) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}>
            {(onMoveUp || onMoveDown) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                <button onClick={onMoveUp} disabled={!onMoveUp}
                  style={{ background: "none", border: "none", cursor: onMoveUp ? "pointer" : "default", padding: "2px 4px", color: onMoveUp ? "var(--foreground-muted)" : "var(--border)", fontSize: "0.625rem", lineHeight: 1 }}>
                  ▲
                </button>
                <button onClick={onMoveDown} disabled={!onMoveDown}
                  style={{ background: "none", border: "none", cursor: onMoveDown ? "pointer" : "default", padding: "2px 4px", color: onMoveDown ? "var(--foreground-muted)" : "var(--border)", fontSize: "0.625rem", lineHeight: 1 }}>
                  ▼
                </button>
              </div>
            )}
            {onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit() }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", color: "var(--foreground-muted)", fontSize: "0.75rem", lineHeight: 1 }}
                title="Editar tarea">
                ✏️
              </button>
            )}
          </div>
        )}
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

        {/* + picker */}
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
                    background: reactions.some((r) => r.emoji === key && r.user_id === myUid)
                      ? "var(--primary-lighter)" : "var(--muted)",
                    border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: "var(--radius-md)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: reactions.some((r) => r.emoji === key && r.user_id === myUid)
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
