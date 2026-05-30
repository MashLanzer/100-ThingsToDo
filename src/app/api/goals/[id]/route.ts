import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })
  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.name) updates.name = body.name
  if (body.target_amount !== undefined) updates.target_amount = Number(body.target_amount)
  if (body.emoji) updates.emoji = body.emoji
  const { data, error } = await supabase.from("savings_goals").update(updates).eq("id", id).eq("couple_id", me.couple_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })
  const { id } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })
  await supabase.from("savings_goals").delete().eq("id", id).eq("couple_id", me.couple_id)
  return NextResponse.json({ ok: true })
}
