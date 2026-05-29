import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// GET /api/challenges/daily — get today's accepted challenge (if any) + history
export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ today: null, history: [] })

  const today = new Date().toISOString().split("T")[0]

  const { data: todayChallenge } = await supabase
    .from("daily_challenge_history")
    .select("*")
    .eq("couple_id", me.couple_id)
    .gte("accepted_at", `${today}T00:00:00Z`)
    .lte("accepted_at", `${today}T23:59:59Z`)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .single()

  const { data: history } = await supabase
    .from("daily_challenge_history")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("accepted_at", { ascending: false })
    .limit(20)

  return NextResponse.json({ today: todayChallenge ?? null, history: history ?? [] })
}

// POST /api/challenges/daily — accept a challenge
export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { challenge_text, category } = await req.json()
  if (!challenge_text?.trim()) return NextResponse.json({ error: "challenge_text required" }, { status: 400 })

  const { data, error } = await supabase
    .from("daily_challenge_history")
    .insert({
      couple_id: me.couple_id,
      challenge_text: challenge_text.trim(),
      category: category ?? null,
      accepted_by: user.uid,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/challenges/daily — mark as completed
export async function PATCH(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { data, error } = await supabase
    .from("daily_challenge_history")
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push notification to partner
  await fetch(`${req.nextUrl.origin}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
    body: JSON.stringify({ title: "¡Reto completado! 🎉", body: data.challenge_text }),
  }).catch(() => {})

  return NextResponse.json(data)
}
