"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { usePlan, useUpdatePlan, useDeletePlan } from "@/hooks/use-plans"
import { useTasks, useCreateTask, useToggleTask, useDeleteTask } from "@/hooks/use-tasks"
import { TaskItem } from "@/components/features/task-item"
import { KAWAII_ICONS } from "@/types"
import { ArrowLeft, Plus, Edit2, X, Trash2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { data: plan, isLoading: planLoading } = usePlan(params.id)
  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useTasks(params.id)
  const createTask = useCreateTask()
  const toggleTask = useToggleTask()
  const deleteTask = useDeleteTask()
  const updatePlan = useUpdatePlan()
  const deletePlan = useDeletePlan()

  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState("")
  const [selectedIcon, setSelectedIcon] = useState("heart")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDesc, setEditDesc] = useState("")

  const iconEntries = Object.entries(KAWAII_ICONS)
  const total = tasks?.length ?? 0
  const done = tasks?.filter((t) => t.completed).length ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  async function handleAddTask() {
    if (!taskTitle.trim()) return
    try {
      await createTask.mutateAsync({ planId: params.id, title: taskTitle.trim(), icon: selectedIcon })
      setTaskTitle("")
      setSelectedIcon("heart")
      setShowTaskForm(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al crear tarea")
    }
  }

  function openEdit() {
    setEditTitle(plan?.title ?? "")
    setEditDesc(plan?.description ?? "")
    setShowEditModal(true)
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) return
    try {
      await updatePlan.mutateAsync({ id: params.id, title: editTitle.trim(), description: editDesc.trim() || undefined })
      setShowEditModal(false)
      toast.success("Plan actualizado ✨")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar")
    }
  }

  async function handleDeletePlan() {
    if (!confirm("¿Seguro que quieres eliminar este plan?")) return
    try {
      await deletePlan.mutateAsync(params.id)
      router.push("/dashboard")
      toast.success("Plan eliminado")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar")
    }
  }

  if (planLoading) {
    return (
      <div className="loading-screen">
        <svg className="animate-heartbeat" width="40" height="40" viewBox="0 0 24 24" fill="#8B5CF6">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {/* Sub-header */}
      <header
        style={{
          position: "sticky",
          top: "53px",
          zIndex: 30,
          background: "rgba(253,252,254,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border)",
          padding: "0.625rem 1rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn-icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "var(--foreground)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {plan?.title ?? "..."}
            </h1>
            {plan?.description && (
              <p style={{ fontSize: "0.75rem", color: "var(--foreground-muted)", marginTop: "1px" }}>
                {plan.description}
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={() => { refetchTasks() }} title="Actualizar">
            <RefreshCw size={15} />
          </button>
          <button className="btn-icon" onClick={openEdit} title="Editar plan">
            <Edit2 size={16} />
          </button>
        </div>
      </header>

      <div className="page-container">
        {/* Progress */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)" }}>
              Progreso
            </span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--primary)" }}>
              {done}/{total}
            </span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Add task button */}
        <div style={{ marginBottom: "1rem" }}>
          <button className="btn btn-primary" onClick={() => setShowTaskForm(true)}>
            <Plus size={18} />
            Agregar Tarea
          </button>
        </div>

        {/* Task form */}
        {showTaskForm && (
          <div className="card animate-fade-in" style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <h2 style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Nueva Tarea</h2>
              <button className="btn-icon" onClick={() => setShowTaskForm(false)}><X size={16} /></button>
            </div>
            <input
              className="input"
              type="text"
              placeholder="Título de la tarea"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              style={{ marginBottom: "0.75rem" }}
              autoFocus
            />
            <div style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--foreground-light)", marginBottom: "0.5rem" }}>
                Ícono personalizado
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {iconEntries.map(([key, emoji]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedIcon(key)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      border: selectedIcon === key ? "2px solid var(--primary)" : "2px solid transparent",
                      background: selectedIcon === key ? "var(--primary-lighter)" : "var(--muted)",
                      fontSize: "1.125rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={key}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleAddTask} disabled={createTask.isPending}>
                {createTask.isPending ? "Creando..." : "Crear"}
              </button>
              <button className="btn btn-outline" onClick={() => setShowTaskForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Tasks list */}
        {tasksLoading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <span style={{ color: "var(--foreground-muted)" }}>Cargando tareas...</span>
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <h2 className="empty-title">Sin tareas aún</h2>
            <p className="empty-text">Agrega tu primera tarea usando el botón de arriba</p>
          </div>
        ) : (
          <div>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => toggleTask.mutate({ taskId: task.id, planId: params.id, completed: task.completed })}
                onDelete={() => deleteTask.mutate({ taskId: task.id, planId: params.id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {showEditModal && (
        <div className="modal-overlay-bg" onClick={() => setShowEditModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Editar Plan</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Título del plan"
                  autoFocus
                />
                <textarea
                  className="textarea"
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descripción (opcional)"
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={updatePlan.isPending}>
                    {updatePlan.isPending ? "Guardando..." : "Guardar Cambios"}
                  </button>
                  <button
                    className="btn btn-outline btn-danger"
                    onClick={handleDeletePlan}
                    disabled={deletePlan.isPending}
                  >
                    <Trash2 size={14} />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
