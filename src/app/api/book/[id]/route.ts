import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/firebase/admin"
import { getSupabaseAdmin } from "@/lib/supabase/admin"

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { id } = await params

  // Only allow deleting your own last entry
  const { data: last } = await supabase
    .from("couple_book_entries")
    .select("id, author_id")
    .eq("couple_id", me.couple_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!last || last.id !== id || last.author_id !== user.uid) {
    return NextResponse.json({ error: "Can only delete your last entry" }, { status: 403 })
  }

  const { error } = await supabase.from("couple_book_entries").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
