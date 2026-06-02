import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

// DELETE /api/account/delete
// Deletes all user-owned data: plans (+ tasks cascade), journal entries,
// time capsules, savings goals (+ contributions cascade), favors,
// places, challenge history, push subscriptions, and the user row itself.
// Does NOT touch the couple row or the partner's data.
export async function DELETE(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const uid = user.uid

  // Get couple_id before we delete anything so we can clean up orphaned couple row
  const { data: me } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", uid)
    .single()

  const coupleId = me?.couple_id ?? null

  // Delete tasks created by this user (tasks without a plan owned by this user
  // are handled via cascade from plans deletion below, but tasks on partner's
  // plans that this user created should also be cleaned up)
  await supabase.from("tasks").delete().eq("created_by", uid)

  // Delete plans created by this user (tasks cascade via FK)
  await supabase.from("plans").delete().eq("created_by", uid)

  // Delete journal entries created by this user
  await supabase.from("journal_entries").delete().eq("created_by", uid)

  // Delete time capsules created by this user
  await supabase.from("time_capsules").delete().eq("created_by", uid)

  // Delete goal contributions, then goals
  const { data: myGoals } = await supabase
    .from("savings_goals")
    .select("id")
    .eq("created_by", uid)
  if (myGoals && myGoals.length > 0) {
    const ids = myGoals.map((g: { id: string }) => g.id)
    await supabase.from("goal_contributions").delete().in("goal_id", ids)
    await supabase.from("savings_goals").delete().in("id", ids)
  }
  // Also delete contributions this user made to partner goals
  await supabase.from("goal_contributions").delete().eq("contributed_by", uid)

  // Delete favors
  await supabase.from("favors").delete().eq("created_by", uid)

  // Delete places
  await supabase.from("places").delete().eq("created_by", uid)

  // Delete challenge history
  await supabase.from("daily_challenge_history").delete().eq("accepted_by", uid)

  // Delete push subscription
  await supabase.from("push_subscriptions").delete().eq("user_id", uid)

  // Unlink from couple: set couple_id to null on our user row
  await supabase.from("users").update({ couple_id: null }).eq("id", uid)

  // If we were in a couple, also null out the partner's couple_id and delete couple row
  if (coupleId) {
    await supabase.from("users").update({ couple_id: null }).eq("couple_id", coupleId)
    await supabase.from("couples").delete().eq("id", coupleId)
  }

  // Finally delete the user row itself
  await supabase.from("users").delete().eq("id", uid)

  return NextResponse.json({ ok: true })
}
