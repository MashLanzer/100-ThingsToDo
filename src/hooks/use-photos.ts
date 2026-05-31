"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFirebaseAuth } from "@/lib/firebase/client"
import type { Photo } from "@/types"

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

async function authFetchFormData(path: string, formData: FormData) {
  const auth = getFirebaseAuth()
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error("Not authenticated")
  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? "Request failed")
  }
  return res.json()
}

export function usePhotos() {
  return useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: () => authFetch("/api/photos"),
    staleTime: 30_000,
    refetchInterval: 20_000,
  })
}

export function useUploadPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, caption }: { file: File; caption?: string }) => {
      const formData = new FormData()
      formData.append("file", file)
      if (caption) formData.append("caption", caption)
      return authFetchFormData("/api/photos", formData)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  })
}

export function useDeletePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authFetch(`/api/photos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  })
}

export function useUpdatePhotoCaption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string | null }) =>
      authFetch(`/api/photos/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ caption }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos"] }),
  })
}

export interface PhotoReaction {
  photo_id: string
  user_id: string
  emoji: string
}

export function usePhotoReactions(photoIds: string[]) {
  return useQuery<PhotoReaction[]>({
    queryKey: ["photo-reactions", photoIds.join(",")],
    queryFn: () => authFetch(`/api/photos/reactions?photo_ids=${photoIds.join(",")}`),
    enabled: photoIds.length > 0,
    staleTime: 15_000,
  })
}

export function useTogglePhotoReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ photoId, emoji }: { photoId: string; emoji: string }) =>
      authFetch("/api/photos/reactions", {
        method: "POST",
        body: JSON.stringify({ photo_id: photoId, emoji }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo-reactions"] }),
  })
}
