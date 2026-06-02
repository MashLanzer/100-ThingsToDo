import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/couple — get couple status + partner info
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, couple_code, couple_id")
    .eq("id", user.uid)
    .single()

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (!me.couple_id) return NextResponse.json({ user: me, couple: null, partner: null })

  // Get partner
  const { data: couple } = await supabase
    .from("couples")
    .select("id, user1_id, user2_id, created_at, anniversary_date, photo_url")
    .eq("id", me.couple_id)
    .single()

  if (!couple) return NextResponse.json({ user: me, couple: null, partner: null })

  const partnerId = couple.user1_id === user.uid ? couple.user2_id : couple.user1_id

  const { data: partner } = await supabase
    .from("users")
    .select("id, name, avatar_url, couple_code")
    .eq("id", partnerId)
    .single()

  return NextResponse.json({ user: me, couple, partner })
}

// POST /api/couple — link partner by their couple code
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 })

  const { data: me } = await supabase
    .from("users")
    .select("id, couple_id, couple_code")
    .eq("id", user.uid)
    .single()

  if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (me.couple_id) return NextResponse.json({ error: "Ya estás vinculado a una pareja" }, { status: 400 })
  if (me.couple_code === code.toUpperCase()) return NextResponse.json({ error: "No puedes vincularte contigo mismo" }, { status: 400 })

  const { data: partner } = await supabase
    .from("users")
    .select("id, couple_id, couple_code")
    .eq("couple_code", code.toUpperCase())
    .single()

  if (!partner) return NextResponse.json({ error: "Código no encontrado" }, { status: 404 })
  if (partner.couple_id) return NextResponse.json({ error: "Ese usuario ya tiene pareja" }, { status: 400 })

  // Create couple
  const { data: couple, error } = await supabase
    .from("couples")
    .insert({ user1_id: user.uid, user2_id: partner.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update both users
  await Promise.all([
    supabase.from("users").update({ couple_id: couple.id }).eq("id", user.uid),
    supabase.from("users").update({ couple_id: couple.id }).eq("id", partner.id),
  ])

  return NextResponse.json({ couple }, { status: 201 })
}

// DELETE /api/couple — unlink
export async function DELETE(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("id, couple_id")
    .eq("id", user.uid)
    .single()

  if (!me?.couple_id) return NextResponse.json({ error: "No estás vinculado" }, { status: 400 })

  // Get both users in couple
  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", me.couple_id)
    .single()

  if (!couple) return NextResponse.json({ error: "Pareja no encontrada" }, { status: 404 })

  // Clear couple_id on both users
  await Promise.all([
    supabase.from("users").update({ couple_id: null }).eq("id", couple.user1_id),
    supabase.from("users").update({ couple_id: null }).eq("id", couple.user2_id),
  ])

  // Delete couple record
  await supabase.from("couples").delete().eq("id", me.couple_id)

  return NextResponse.json({ ok: true })
}

// PATCH /api/couple — update shared couple settings (anniversary, etc.)
export async function PATCH(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase
    .from("users")
    .select("id, couple_id")
    .eq("id", user.uid)
    .single()

  if (!me?.couple_id) return NextResponse.json({ error: "No estás vinculado" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if ("anniversary_date" in body) {
    patch.anniversary_date = body.anniversary_date || null
  }
  if ("photo_url" in body) {
    patch.photo_url = body.photo_url || null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
  }

  const { data: couple, error } = await supabase
    .from("couples")
    .update(patch)
    .eq("id", me.couple_id)
    .select("id, user1_id, user2_id, created_at, anniversary_date, photo_url")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ couple })
}
