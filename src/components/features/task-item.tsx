"use client"

import React, { useState, useRef } from "react"
import { KAWAII_ICONS } from "@/types"
import type { Task } from "@/types"
import { Trash2, Check } from "lucide-react"

interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onEdit?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function TaskItem({ task, onToggle, onDelete, onEdit, onMoveUp, onMoveDown }: Props) {
  const emoji = KAWAII_ICONS[task.icon] ?? task.icon
  const [popping, setPopping] = useState(false)
  const [sparkle, setSparkle] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number>(0)

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
      >
        <button
          className={`task-checkbox ${task.completed ? "checked" : ""} ${popping ? "animate-task-pop" : ""}`}
          onClick={handleToggle}
          title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
          style={{ position: "relative" }}
        >
          {task.completed && <Check size={13} color="white" strokeWidth={3} />}
          {sparkle && (
            <span className="animate-sparkle" style={{ top: "-8px", left: "50%", transform: "translateX(-50%)" }}>
              ✨
            </span>
          )}
        </button>

        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: task.completed
            ? "linear-gradient(135deg, var(--primary), var(--secondary))"
            : "var(--primary-lighter)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "1.125rem",
        }}>
          {emoji}
        </div>

        <span
          className="task-title"
          style={{
            flex: 1,
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--foreground)",
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
              const [y, m, d] = task.due_date.split("-")
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
                <button
                  onClick={onMoveUp}
                  disabled={!onMoveUp}
                  style={{ background: "none", border: "none", cursor: onMoveUp ? "pointer" : "default", padding: "2px 4px", color: onMoveUp ? "var(--foreground-muted)" : "var(--border)", fontSize: "0.625rem", lineHeight: 1 }}
                >▲</button>
                <button
                  onClick={onMoveDown}
                  disabled={!onMoveDown}
                  style={{ background: "none", border: "none", cursor: onMoveDown ? "pointer" : "default", padding: "2px 4px", color: onMoveDown ? "var(--foreground-muted)" : "var(--border)", fontSize: "0.625rem", lineHeight: 1 }}
                >▼</button>
              </div>
            )}
            {onEdit && (
              <button
                onClick={onEdit}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", color: "var(--foreground-muted)", fontSize: "0.75rem", lineHeight: 1 }}
                title="Editar tarea"
              >✏️</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
