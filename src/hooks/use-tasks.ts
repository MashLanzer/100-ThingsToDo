"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFirebaseAuth } from "@/lib/firebase/client"
import type { Task } from "@/types"

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

export function useTasks(planId: string) {
  return useQuery<Task[]>({
    queryKey: ["tasks", planId],
    queryFn: () => authFetch(`/api/plans/${planId}/tasks`),
    enabled: !!planId,
    refetchInterval: 15_000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, ...data }: { planId: string; title: string; icon: string; notes?: string; due_date?: string; reminder_at?: string | null; assigned_to?: string | null; task_photos?: string[] }) =>
      authFetch(`/api/plans/${planId}/tasks`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.planId] }),
  })
}

export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, planId, completed }: { taskId: string; planId: string; completed: boolean }) =>
      authFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ completed: !completed }) }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.planId] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, planId }: { taskId: string; planId: string }) =>
      authFetch(`/api/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.planId] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, planId, ...data }: { taskId: string; planId: string; title?: string; icon?: string; sort_order?: number; notes?: string | null; due_date?: string | null; reminder_at?: string | null; assigned_to?: string | null; task_photos?: string[] }) =>
      authFetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["tasks", vars.planId] }),
  })
}
