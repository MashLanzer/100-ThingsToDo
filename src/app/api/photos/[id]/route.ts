import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

const FIREBASE_API_KEY = process.env.FEBRERO_FIREBASE_API_KEY!
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/febrero-d6968/databases/(default)/documents"

function isFirestoreId(id: string) {
  return id.startsWith("firestore-")
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const caption: string | null = typeof body.caption === "string" ? body.caption.trim() || null : null

  if (isFirestoreId(id)) {
    const firestoreId = id.replace("firestore-", "")
    const body = {
      fields: {
        ...(caption ? { caption: { stringValue: caption } } : {}),
      },
      updateMask: { fieldPaths: ["caption"] },
    }
    const res = await fetch(
      `${FIRESTORE_BASE}/memories/${firestoreId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=caption`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    )
    if (!res.ok) return NextResponse.json({ error: "Firestore update failed" }, { status: 502 })
    return NextResponse.json({ success: true, caption })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { error } = await supabase.from("photos").update({ caption }).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, caption })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  if (isFirestoreId(id)) {
    const firestoreId = id.replace("firestore-", "")
    const res = await fetch(`${FIRESTORE_BASE}/memories/${firestoreId}?key=${FIREBASE_API_KEY}`, {
      method: "DELETE",
    })
    if (!res.ok && res.status !== 404) {
      return NextResponse.json({ error: "Firestore delete failed" }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { error } = await supabase.from("photos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
