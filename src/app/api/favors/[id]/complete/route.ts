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

  const { data, error } = await supabase
    .from("favors")
    .update({ is_completed: true, completed_by: user.uid, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("couple_id", me.couple_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send push to partner
  await fetch(`${req.nextUrl.origin}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: req.headers.get("Authorization") ?? "" },
    body: JSON.stringify({ title: "¡Favor completado! 💝", body: data.title }),
  }).catch(() => {})

  return NextResponse.json(data)
}
