import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

const IMGBB_API_KEY = process.env.IMGBB_API_KEY!
const FIREBASE_API_KEY = process.env.FEBRERO_FIREBASE_API_KEY!
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/febrero-d6968/databases/(default)/documents"

interface FirestoreDoc {
  name: string
  fields: Record<string, { stringValue?: string; timestampValue?: string }>
  createTime: string
}

function parseFirestoreDoc(doc: FirestoreDoc) {
  const id = "firestore-" + (doc.name.split("/").pop() ?? "")
  const f = doc.fields ?? {}
  return {
    id,
    image_url: f.imageUrl?.stringValue ?? "",
    thumb_url: f.thumbUrl?.stringValue ?? null,
    delete_url: f.deleteUrl?.stringValue ?? null,
    caption: f.caption?.stringValue ?? null,
    source: f.source?.stringValue ?? "14feb",
    created_at: f.timestamp?.timestampValue ?? doc.createTime ?? new Date().toISOString(),
  }
}

async function fetchFirestorePhotos(): Promise<ReturnType<typeof parseFirestoreDoc>[]> {
  if (!FIREBASE_API_KEY) return []
  try {
    const docs: FirestoreDoc[] = []
    let pageToken: string | undefined
    do {
      const params = new URLSearchParams({ key: FIREBASE_API_KEY, pageSize: "300" })
      if (pageToken) params.set("pageToken", pageToken)
      const res = await fetch(`${FIRESTORE_BASE}/memories?${params}`)
      if (!res.ok) break
      const data = await res.json()
      if (data.documents) docs.push(...(data.documents as FirestoreDoc[]))
      pageToken = data.nextPageToken
    } while (pageToken)
    return docs.map(parseFirestoreDoc).filter((p) => p.image_url)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const searchParams = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  // Only paginate when a `limit` param is explicitly provided. Without it we
  // must return a plain array (the gallery expects an array, not an object).
  const limitParam = searchParams.get("limit")
  const paginated = limitParam !== null
  const limit = paginated ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 30)) : 0
  const debug = searchParams.get("debug") === "1"

  // Get couple_id for this user
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  const coupleId = me?.couple_id

  // Build the list of collection_key values to search.
  // Photos are stored under couple_id (when linked) or user.uid (when solo).
  // We also fetch photos from each couple member's uid to recover from any
  // re-link event where the couple_id changed.
  const collectionKeys: string[] = [...new Set([coupleId, user.uid].filter(Boolean) as string[])]

  // If linked, also add both member UIDs so we catch photos uploaded
  // before the couple_id was assigned (e.g. during solo testing).
  if (coupleId) {
    const { data: couple } = await supabase
      .from("couples").select("user1_id, user2_id").eq("id", coupleId).single()
    if (couple?.user1_id) collectionKeys.push(couple.user1_id)
    if (couple?.user2_id) collectionKeys.push(couple.user2_id)
  }

  // De-duplicate
  const uniqueKeys = [...new Set(collectionKeys)]

  // Fetch from Supabase photos table (simple .in() — no OR, no complex filter)
  let supabasePhotos: Array<{
    id: string; image_url: string; thumb_url: string | null; delete_url: string | null;
    caption: string | null; source: string; created_at: string; collection_key: string;
  }> = []
  let supabaseError: string | null = null
  if (uniqueKeys.length > 0) {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .in("collection_key", uniqueKeys)
      .order("created_at", { ascending: false })
    if (error) { console.error("[photos GET]", error.message); supabaseError = error.message }
    supabasePhotos = data ?? []
  }

  // Fetch from Firestore (legacy photos from before migration)
  const firestorePhotos = await fetchFirestorePhotos()

  // Merge: Supabase first, then Firestore photos not already in Supabase (dedupe by image_url)
  const seenUrls = new Set(supabasePhotos.map((p) => p.image_url))
  const merged = [
    ...supabasePhotos,
    ...firestorePhotos.filter((p) => !seenUrls.has(p.image_url)),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Debug mode: return diagnostic info instead of photos
  if (debug) {
    return NextResponse.json({
      uid: user.uid,
      couple_id: coupleId ?? null,
      collection_keys: uniqueKeys,
      supabase_count: supabasePhotos.length,
      supabase_error: supabaseError,
      firestore_count: firestorePhotos.length,
      total: merged.length,
    })
  }

  if (paginated) {
    const offset = (page - 1) * limit
    const slice = merged.slice(offset, offset + limit)
    return NextResponse.json({
      photos: slice,
      total: merged.length,
      page,
      limit,
      hasMore: offset + limit < merged.length,
    })
  }

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id, name, avatar_url").eq("id", user.uid).single()
  const coupleId = me?.couple_id ?? user.uid

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Field 'file' is required" }, { status: 400 })
  }

  const caption = formData.get("caption")
  const captionStr = typeof caption === "string" ? caption.trim() || null : null

  // Upload to ImgBB
  const imgbbForm = new FormData()
  imgbbForm.append("image", file)
  const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST",
    body: imgbbForm,
  })
  if (!imgbbRes.ok) return NextResponse.json({ error: "ImgBB upload failed" }, { status: 502 })

  const imgbbData = await imgbbRes.json()
  if (!imgbbData?.data?.url) return NextResponse.json({ error: "ImgBB response invalid" }, { status: 502 })

  const imageUrl: string = imgbbData.data.url
  const thumbUrl: string = imgbbData.data.thumb?.url ?? imageUrl
  const deleteUrl: string | null = imgbbData.data.delete_url ?? null

  // Try Supabase photos table first
  const baseRow = {
    collection_key: coupleId,
    image_url: imageUrl,
    thumb_url: thumbUrl,
    delete_url: deleteUrl,
    caption: captionStr,
    source: "thingstodo",
  }
  const uploaderRow = {
    ...baseRow,
    uploaded_by: user.uid,
    uploaded_by_name: me?.name ?? null,
    uploaded_by_avatar: me?.avatar_url ?? null,
  }

  let { data: photoData, error: photoError } = await supabase
    .from("photos").insert(uploaderRow).select().single()

  // If the uploader columns don't exist yet (migration 018 not applied),
  // retry with only the base columns so uploads keep working.
  if (photoError && /column .* does not exist|uploaded_by/i.test(photoError.message)) {
    ;({ data: photoData, error: photoError } = await supabase
      .from("photos").insert(baseRow).select().single())
  }

  // If Supabase fails (e.g. migration not applied yet), fall back to Firestore
  if (photoError) {
    const now = new Date().toISOString()
    const firestoreBody = {
      fields: {
        imageUrl: { stringValue: imageUrl },
        thumbUrl: { stringValue: thumbUrl },
        ...(deleteUrl ? { deleteUrl: { stringValue: deleteUrl } } : {}),
        ...(captionStr ? { caption: { stringValue: captionStr } } : {}),
        fileName: { stringValue: (file as File).name },
        source: { stringValue: "thingstodo" },
        timestamp: { timestampValue: now },
      },
    }
    const firestoreRes = await fetch(`${FIRESTORE_BASE}/memories?key=${FIREBASE_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(firestoreBody),
    })
    if (!firestoreRes.ok) return NextResponse.json({ error: "Upload failed" }, { status: 502 })
    const firestoreData = await firestoreRes.json()
    return NextResponse.json({
      id: "firestore-" + firestoreData.name?.split("/").pop(),
      image_url: imageUrl,
      thumb_url: thumbUrl,
      delete_url: deleteUrl,
      caption: captionStr,
      source: "thingstodo",
      created_at: now,
    }, { status: 201 })
  }

  return NextResponse.json(photoData, { status: 201 })
}
