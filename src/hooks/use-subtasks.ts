"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFirebaseAuth } from "@/lib/firebase/client"

export interface Subtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

async function authFetch(path: string, init?: RequestInit) {
  const auth = getFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? "Request failed")
  }
  return res.json()
}

export function useSubtasks(taskId: string) {
  return useQuery<Subtask[]>({
    queryKey: ["subtasks", taskId],
    queryFn: () => authFetch(`/api/tasks/${taskId}/subtasks`),
    enabled: !!taskId,
  })
}

export function useCreateSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, title, sort_order = 0 }: { taskId: string; title: string; sort_order?: number }) =>
      authFetch(`/api/tasks/${taskId}/subtasks`, { method: "POST", body: JSON.stringify({ title, sort_order }) }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["subtasks", vars.taskId] }),
  })
}

export function useToggleSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtask }: { taskId: string; subtask: Subtask }) =>
      authFetch(`/api/tasks/${taskId}/subtasks?subtaskId=${subtask.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !subtask.completed }),
      }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["subtasks", vars.taskId] }),
  })
}

export function useDeleteSubtask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, subtaskId }: { taskId: string; subtaskId: string }) =>
      authFetch(`/api/tasks/${taskId}/subtasks?subtaskId=${subtaskId}`, { method: "DELETE" }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["subtasks", vars.taskId] }),
  })
}
