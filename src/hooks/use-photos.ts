"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"
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

// F1: Paginated photos hook using infinite query (30 per page)
const PAGE_LIMIT = 30

export function usePhotos() {
  return useQuery<Photo[]>({
    queryKey: ["photos"],
    queryFn: () => authFetch("/api/photos"),
    staleTime: 30_000,
    refetchInterval: 20_000,
  })
}

export interface PhotosPage {
  photos: Photo[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export function usePhotosPaginated() {
  return useInfiniteQuery<PhotosPage>({
    queryKey: ["photos-paginated"],
    queryFn: ({ pageParam = 1 }) =>
      authFetch(`/api/photos?page=${pageParam}&limit=${PAGE_LIMIT}`),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 30_000,
    refetchInterval: 60_000,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos"] })
      qc.invalidateQueries({ queryKey: ["photos-paginated"] })
    },
  })
}

export function useDeletePhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authFetch(`/api/photos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos"] })
      qc.invalidateQueries({ queryKey: ["photos-paginated"] })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos"] })
      qc.invalidateQueries({ queryKey: ["photos-paginated"] })
    },
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

// ── Comments ──────────────────────────────────────────────────────────────────

export interface PhotoComment {
  id: string
  photo_id: string
  user_id: string
  user_name: string
  content: string
  parent_comment_id?: string | null
  created_at: string
  replies?: PhotoComment[]
}

export function usePhotoComments(photoIds: string[]) {
  return useQuery<PhotoComment[]>({
    queryKey: ["photo-comments", photoIds.join(",")],
    queryFn: () => authFetch(`/api/photos/comments?photo_ids=${photoIds.join(",")}`),
    enabled: photoIds.length > 0,
    staleTime: 10_000,
  })
}

export function useAddPhotoComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ photoId, content, parentCommentId }: { photoId: string; content: string; parentCommentId?: string | null }) =>
      authFetch("/api/photos/comments", {
        method: "POST",
        body: JSON.stringify({ photo_id: photoId, content, parent_comment_id: parentCommentId ?? null }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo-comments"] }),
  })
}

export function useDeletePhotoComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/photos/comments?id=${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo-comments"] }),
  })
}

// ── Photo Views (F9) ──────────────────────────────────────────────────────────

export interface PhotoViewData {
  count: number
  partner_viewed: boolean
}

export function usePhotoViews(photoIds: string[]) {
  return useQuery<Record<string, PhotoViewData>>({
    queryKey: ["photo-views", photoIds.join(",")],
    queryFn: () => authFetch(`/api/photos/views?photo_ids=${photoIds.join(",")}`),
    enabled: photoIds.length > 0,
    staleTime: 30_000,
  })
}

export function useMarkPhotoViewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (photoId: string) =>
      authFetch("/api/photos/views", {
        method: "POST",
        body: JSON.stringify({ photo_id: photoId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo-views"] }),
  })
}

// ── Albums (F3) ───────────────────────────────────────────────────────────────

export interface PhotoAlbum {
  id: string
  couple_id: string
  name: string
  description: string | null
  cover_image: string | null
  created_by: string
  created_at: string
}

export function usePhotoAlbums() {
  return useQuery<PhotoAlbum[]>({
    queryKey: ["photo-albums"],
    queryFn: () => authFetch("/api/photos/albums"),
    staleTime: 60_000,
  })
}

export function useCreatePhotoAlbum() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; cover_image?: string }) =>
      authFetch("/api/photos/albums", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photo-albums"] }),
  })
}

export function useUpdatePhotoAlbum() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; cover_image?: string; addPhotoIds?: string[]; removePhotoIds?: string[] }) =>
      authFetch(`/api/photos/albums/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photo-albums"] })
      qc.invalidateQueries({ queryKey: ["photos"] })
      qc.invalidateQueries({ queryKey: ["photos-paginated"] })
    },
  })
}

export function useDeletePhotoAlbum() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authFetch(`/api/photos/albums/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photo-albums"] })
      qc.invalidateQueries({ queryKey: ["photos"] })
    },
  })
}
