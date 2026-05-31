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

  // Get couple_id for this user
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  const coupleId = me?.couple_id

  // Fetch from Supabase photos table (new system)
  let supabasePhotos: Array<{
    id: string; image_url: string; thumb_url: string | null; delete_url: string | null;
    caption: string | null; source: string; created_at: string; collection_key: string;
  }> = []
  if (coupleId) {
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("collection_key", coupleId)
      .order("created_at", { ascending: false })
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

  return NextResponse.json(merged)
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
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
  const { data: photoData, error: photoError } = await supabase
    .from("photos")
    .insert({
      collection_key: coupleId,
      image_url: imageUrl,
      thumb_url: thumbUrl,
      delete_url: deleteUrl,
      caption: captionStr,
      source: "thingstodo",
    })
    .select()
    .single()

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
