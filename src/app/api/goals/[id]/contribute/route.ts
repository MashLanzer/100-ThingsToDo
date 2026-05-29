import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface Context { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Context) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { id: goalId } = await params
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  // Verify goal belongs to couple
  const { data: goal } = await supabase
    .from("savings_goals")
    .select("id")
    .eq("id", goalId)
    .eq("couple_id", me.couple_id)
    .single()

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { amount } = await req.json()
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "amount must be positive" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("goal_contributions")
    .insert({ goal_id: goalId, amount: Number(amount), contributed_by: user.uid })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
