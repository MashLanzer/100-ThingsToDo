import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { sendPushNotification } from "@/lib/push"

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ ok: true }) // silently skip

  // Get partner's user id
  const { data: me } = await supabase
    .from("users")
    .select("couple_id")
    .eq("id", user.uid)
    .single()

  if (!me?.couple_id) return NextResponse.json({ ok: true })

  const { data: couple } = await supabase
    .from("couples")
    .select("user1_id, user2_id")
    .eq("id", me.couple_id)
    .single()

  if (!couple) return NextResponse.json({ ok: true })

  const partnerId = couple.user1_id === user.uid ? couple.user2_id : couple.user1_id

  const { data: subscription, error: subError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", partnerId)
    .single()

  // Table doesn't exist or no subscription — skip silently
  if (subError || !subscription) return NextResponse.json({ ok: true })

  const { title, body, icon } = await req.json()

  try {
    await sendPushNotification(
      { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth_key: subscription.auth_key },
      { title: title ?? "ThingsToDo 💕", body: body ?? "", icon: icon ?? "/icons/icon-192.png" }
    )
  } catch {
    // Push delivery failed — don't break the caller
  }

  return NextResponse.json({ ok: true })
}
