import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json([])

  const { data, error } = await supabase
    .from("savings_goals_with_total")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const body = await req.json()
  const { name, target_amount } = body
  if (!name?.trim() || !target_amount) {
    return NextResponse.json({ error: "name and target_amount required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("savings_goals")
    .insert({ couple_id: me.couple_id, name: name.trim(), target_amount: Number(target_amount), created_by: user.uid, emoji: body.emoji ?? "🐖" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, total_saved: 0 }, { status: 201 })
}
