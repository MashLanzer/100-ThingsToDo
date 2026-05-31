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

  // Fetch the capsule first to validate unlock time
  const { data: capsule } = await supabase
    .from("time_capsules")
    .select("id, unlock_date, unlock_at, is_opened")
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .single()

  if (!capsule) return NextResponse.json({ error: "Capsule not found" }, { status: 404 })
  if (capsule.is_opened) return NextResponse.json({ error: "Already opened" }, { status: 409 })

  const now = new Date()

  // If unlock_at (date+time) is set, check against full timestamp
  if (capsule.unlock_at) {
    const unlockAt = new Date(capsule.unlock_at)
    if (now < unlockAt) {
      return NextResponse.json({ error: "not_ready", unlock_at: capsule.unlock_at }, { status: 403 })
    }
  } else {
    // Fall back to date-only comparison
    const todayStr = now.toISOString().split("T")[0]
    if (capsule.unlock_date > todayStr) {
      return NextResponse.json({ error: "not_ready", unlock_date: capsule.unlock_date }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from("time_capsules")
    .update({ is_opened: true })
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
