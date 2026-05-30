import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ lastActive: null })
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ lastActive: null })
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ lastActive: null })
  // Get all plans in couple
  const { data: plans } = await supabase.from("plans").select("id").eq("couple_id", me.couple_id)
  if (!plans?.length) return NextResponse.json({ lastActive: null })
  const planIds = plans.map((p: { id: string }) => p.id)
  // Find most recent partner task completion
  const { data: task } = await supabase
    .from("tasks")
    .select("completed_at")
    .in("plan_id", planIds)
    .neq("completed_by", user.uid)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return NextResponse.json({ lastActive: task?.completed_at ?? null })
}
