import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { id } = await params

  const { error } = await supabase
    .from("couple_moments")
    .delete()
    .eq("id", id)
    .eq("couple_id", me.couple_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
