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

  const body = await req.json()
  const { amount, note } = body
  if (amount === undefined || Number(amount) === 0) {
    return NextResponse.json({ error: "amount must not be zero" }, { status: 400 })
  }

  const numAmount = Number(amount)

  // If withdrawal, check that it won't make the total go negative
  if (numAmount < 0) {
    const { data: current } = await supabase
      .from("savings_goals_with_total")
      .select("total_saved")
      .eq("id", goalId)
      .single()
    if ((current?.total_saved ?? 0) + numAmount < 0) {
      return NextResponse.json({ error: "No hay suficiente saldo para retirar" }, { status: 400 })
    }
  }

  const insertData: Record<string, unknown> = {
    goal_id: goalId,
    amount: numAmount,
    contributed_by: user.uid,
  }
  if (note) insertData.note = note

  let { data, error } = await supabase
    .from("goal_contributions")
    .insert(insertData)
    .select()
    .single()

  // Retry without note if the column doesn't exist yet
  if (error && error.message.includes("note column does not exist")) {
    const { note: _n, ...insertWithoutNote } = insertData
    void _n
    ;({ data, error } = await supabase
      .from("goal_contributions")
      .insert(insertWithoutNote)
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
