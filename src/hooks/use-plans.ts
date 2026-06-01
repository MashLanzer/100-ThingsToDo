"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFirebaseToken } from "@/lib/firebase/client"
import type { Plan } from "@/types"

async function authFetch(path: string, init?: RequestInit) {
  const token = await getFirebaseToken()
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

export function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => authFetch("/api/plans"),
    staleTime: 30_000,
    refetchInterval: 20_000,
  })
}

export function usePlan(id: string) {
  return useQuery<Plan>({
    queryKey: ["plans", id],
    queryFn: () => authFetch(`/api/plans/${id}`),
    refetchInterval: 15_000,
  })
}

export function useCreatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; description?: string; cover_image?: string; due_date?: string; tags?: string[] }) =>
      authFetch("/api/plans", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  })
}

export function useUpdatePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; description?: string; archived?: boolean; cover_image?: string | null; due_date?: string | null; tags?: string[] }) =>
      authFetch(`/api/plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["plans"] })
      qc.invalidateQueries({ queryKey: ["plans", vars.id] })
    },
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authFetch(`/api/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plans"] }),
  })
}
