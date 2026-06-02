import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ ok: true }) // silently skip

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 })

  const { error } = await supabase
    .from("fcm_tokens")
    .upsert(
      { user_id: user.uid, token, platform: "android", updated_at: new Date().toISOString() },
      { onConflict: "token" }
    )

  if (error) {
    // 42P01 = table does not exist in Postgres — fail silently so the app keeps working
    if (error.code === "42P01") return NextResponse.json({ ok: true, skipped: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ ok: true })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 })

  await supabase.from("fcm_tokens").delete().eq("token", token).eq("user_id", user.uid)
  return NextResponse.json({ ok: true })
}
