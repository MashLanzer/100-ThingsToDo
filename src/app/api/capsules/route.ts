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
    .from("time_capsules")
    .select("*")
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const capsules = data ?? []

  // Send push for capsules that became ready today
  const todayStr = new Date().toISOString().split("T")[0]
  const readyToday = (capsules ?? []).filter(
    (c: { is_opened: boolean; unlock_date: string }) => !c.is_opened && c.unlock_date === todayStr
  )
  if (readyToday.length > 0) {
    const label = readyToday.length === 1
      ? "¡Una cápsula está lista para abrir! 💎"
      : `¡${readyToday.length} cápsulas están listas para abrir! 💎`
    fetch(`${req.nextUrl.origin}/api/push/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
      body: JSON.stringify({ title: "¡Cápsula del tiempo! ⏳", body: label }),
    }).catch(() => {})
  }

  return NextResponse.json(capsules)
}

export async function POST(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { message, type, unlock_date, unlock_at } = await req.json()
  if (!message?.trim() || !unlock_date) {
    return NextResponse.json({ error: "message and unlock_date required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("time_capsules")
    .insert({
      couple_id: me.couple_id,
      message: message.trim(),
      ...(unlock_at ? { unlock_at } : {}),
      type: type ?? "memory",
      unlock_date,
      created_by: user.uid,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
