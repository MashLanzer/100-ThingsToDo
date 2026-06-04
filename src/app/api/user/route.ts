import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function PATCH(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch {
    return NextResponse.json({ error: "DB unavailable" }, { status: 503 })
  }

  const body = await req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.avatar_url === "string" || body.avatar_url === null) allowed.avatar_url = body.avatar_url
  if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  const { error } = await supabase.from("users").update(allowed).eq("id", user.uid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
