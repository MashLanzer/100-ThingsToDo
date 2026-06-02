import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { sendPushNotification } from "@/lib/push"
import { sendFcmToTokens } from "@/lib/fcm"

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

  const { title, body, icon, url } = await req.json()
  const safeTitle = title ?? "ThingsToDo 💕"
  const safeBody = body ?? ""

  // Web push (existing behaviour) — fire only if the partner has a web subscription.
  const { data: subscription, error: subError } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", partnerId)
    .single()

  if (!subError && subscription) {
    try {
      await sendPushNotification(
        { endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth_key: subscription.auth_key },
        { title: safeTitle, body: safeBody, icon: icon ?? "/icons/icon-192.png", url }
      )
    } catch {
      // Push delivery failed — don't break the caller
    }
  }

  // Native push (FCM) — fire to all of the partner's registered devices.
  // Best-effort: never let a failure break the response.
  try {
    const { data: tokenRows } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", partnerId)

    const tokens = (tokenRows ?? []).map((r) => r.token).filter(Boolean) as string[]
    if (tokens.length) {
      const { invalidTokens } = await sendFcmToTokens(tokens, {
        title: safeTitle,
        body: safeBody,
        url: url ?? "/",
      })
      if (invalidTokens.length) {
        await supabase.from("fcm_tokens").delete().in("token", invalidTokens)
      }
    }
  } catch {
    // FCM delivery failed or table missing — don't break the caller
  }

  return NextResponse.json({ ok: true })
}
