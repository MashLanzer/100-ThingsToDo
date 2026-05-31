import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"

const IMGBB_API_KEY = process.env.IMGBB_API_KEY!
const FIREBASE_API_KEY = process.env.FEBRERO_FIREBASE_API_KEY!
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/febrero-d6968/databases/(default)/documents"

interface FirestoreDoc {
  name: string
  fields: Record<string, { stringValue?: string; timestampValue?: string }>
  createTime: string
}

function parseDoc(doc: FirestoreDoc) {
  const id = doc.name.split("/").pop() ?? ""
  const f = doc.fields ?? {}
  return {
    id,
    image_url: f.imageUrl?.stringValue ?? "",
    thumb_url: f.thumbUrl?.stringValue ?? null,
    delete_url: f.deleteUrl?.stringValue ?? null,
    file_name: f.fileName?.stringValue ?? null,
    caption: f.caption?.stringValue ?? null,
    source: f.source?.stringValue ?? "14feb",
    created_at: f.timestamp?.timestampValue ?? doc.createTime ?? new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = `${FIRESTORE_BASE}/memories?key=${FIREBASE_API_KEY}&pageSize=200`
  const res = await fetch(url)
  if (!res.ok) return NextResponse.json({ error: "Firestore error" }, { status: 502 })

  const data = await res.json()
  const docs: FirestoreDoc[] = data.documents ?? []

  const photos = docs
    .map(parseDoc)
    .filter((p) => p.image_url)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(photos)
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  // Save to Firebase Firestore (febrero-d6968 / memories)
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
  if (!firestoreRes.ok) return NextResponse.json({ error: "Firestore save failed" }, { status: 502 })

  const firestoreData: FirestoreDoc = await firestoreRes.json()
  return NextResponse.json(parseDoc(firestoreData), { status: 201 })
}
