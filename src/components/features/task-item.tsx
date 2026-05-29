"use client"

import { KAWAII_ICONS } from "@/types"
import type { Task } from "@/types"
import { Trash2, Check } from "lucide-react"

interface Props {
  task: Task
  onToggle: () => void
  onDelete: () => void
}

export function TaskItem({ task, onToggle, onDelete }: Props) {
  const emoji = KAWAII_ICONS[task.icon] ?? task.icon

  return (
    <div className={`task-item animate-fade-in ${task.completed ? "completed" : ""}`}>
      <button
        className={`task-checkbox ${task.completed ? "checked" : ""}`}
        onClick={onToggle}
        title={task.completed ? "Marcar como pendiente" : "Marcar como completada"}
      >
        {task.completed && <Check size={12} color="white" strokeWidth={3} />}
      </button>

      <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{emoji}</span>

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
      </span>

      <button
        className="btn-icon-small"
        onClick={onDelete}
        title="Eliminar tarea"
        style={{ color: "var(--destructive-dark)", flexShrink: 0 }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
