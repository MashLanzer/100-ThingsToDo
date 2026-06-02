"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFirebaseToken } from "@/lib/firebase/client"
import type { User, Couple } from "@/types"

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

export interface CoupleStatus {
  user: User
  couple: Couple | null
  partner: User | null
}

export function useCoupleStatus() {
  return useQuery<CoupleStatus>({
    queryKey: ["couple"],
    queryFn: () => authFetch("/api/couple"),
    staleTime: 30_000,
  })
}

export function useLinkPartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) =>
      authFetch("/api/couple", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["couple"] }),
  })
}

export function useUnlinkPartner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => authFetch("/api/couple", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["couple"] }),
  })
}

export function useUpdateCouple() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { anniversary_date?: string | null; photo_url?: string | null }) =>
      authFetch("/api/couple", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["couple"] }),
  })
}
