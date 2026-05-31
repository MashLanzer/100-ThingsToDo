import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "DB unavailable" }, { status: 503 })

  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ error: "Not in a couple" }, { status: 403 })

  const { id } = await params

  const { data: photo, error: fetchError } = await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 })
  }

  // Security: only delete if photo belongs to this couple
  if (photo.collection_key !== me.couple_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete from storage if uploaded via ThingsToDo (delete_url is the storage path)
  if (photo.source === "thingstodo" && photo.delete_url) {
    await supabaseAdmin.storage.from("couple-photos").remove([photo.delete_url])
  }
  // If source is '14feb', skip storage deletion (ImgBB handles it externally)

  const { error: deleteError } = await supabase.from("photos").delete().eq("id", id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
