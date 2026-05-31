import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"

const FIREBASE_API_KEY = process.env.FEBRERO_FIREBASE_API_KEY!
const FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/febrero-d6968/databases/(default)/documents"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const res = await fetch(`${FIRESTORE_BASE}/memories/${id}?key=${FIREBASE_API_KEY}`, {
    method: "DELETE",
  })

  if (!res.ok && res.status !== 404) {
    return NextResponse.json({ error: "Firestore delete failed" }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
