import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json([])

  const { id: planId } = await params

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  const { data, error } = await supabase
    .from("plan_reactions")
    .select("id, emoji, user_id")
    .eq("plan_id", planId)

  if (error) return NextResponse.json([])
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id: planId } = await params
  const body = await req.json()
  const { emoji } = body
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data: plan } = await supabase
    .from("plans")
    .select("id")
    .eq("id", planId)
    .eq("couple_id", me.couple_id)
    .single()
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { data: existing } = await supabase
    .from("plan_reactions")
    .select("id")
    .eq("plan_id", planId)
    .eq("user_id", user.uid)
    .eq("emoji", emoji)
    .single()

  if (existing) {
    await supabase.from("plan_reactions").delete().eq("id", existing.id)
  } else {
    await supabase.from("plan_reactions").insert({ plan_id: planId, user_id: user.uid, emoji })
  }

  return NextResponse.json({ ok: true })
}
