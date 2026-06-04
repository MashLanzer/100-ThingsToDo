import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken } from "@/lib/api-auth"
import { getSupabaseAdmin } from "@/lib/supabase/server"

interface ActivityEvent {
  id: string
  type: "task_complete" | "plan_created" | "favor_complete" | "journal_entry" | "photo_upload"
  description: string
  created_at: string
}

export async function GET(req: NextRequest) {
  const user = await verifyFirebaseToken(req)
  if (!user) return NextResponse.json({ lastActive: null, events: [] })
  const supabase = getSupabaseAdmin()
  if (!supabase) return NextResponse.json({ lastActive: null, events: [] })
  const { data: me } = await supabase.from("users").select("couple_id").eq("id", user.uid).single()
  if (!me?.couple_id) return NextResponse.json({ lastActive: null, events: [] })

  // Get all plans in couple
  const { data: plans } = await supabase.from("plans").select("id, title").eq("couple_id", me.couple_id)
  const events: ActivityEvent[] = []
  let latestAt: string | null = null

  if (plans?.length) {
    const planIds = plans.map((p: { id: string }) => p.id)

    // Partner task completions (last 5)
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, completed_at, plan_id")
      .in("plan_id", planIds)
      .neq("completed_by", user.uid)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(5)

    if (tasks?.length) {
      for (const t of tasks as { id: string; title: string; completed_at: string; plan_id: string }[]) {
        events.push({
          id: `task-${t.id}`,
          type: "task_complete",
          description: t.title,
          created_at: t.completed_at,
        })
      }
      latestAt = tasks[0]?.completed_at ?? null
    }
  }

  // Partner journal entries (last 3)
  try {
    const { data: journals } = await supabase
      .from("journal_entries")
      .select("id, date, created_at")
      .eq("couple_id", me.couple_id)
      .neq("created_by", user.uid)
      .order("created_at", { ascending: false })
      .limit(3)
    if (journals?.length) {
      for (const j of journals as { id: string; date: string; created_at: string }[]) {
        events.push({
          id: `journal-${j.id}`,
          type: "journal_entry",
          description: `Entrada del ${new Date(j.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
          created_at: j.created_at,
        })
      }
    }
  } catch { /* ignore if table unavailable */ }

  // Sort all events by date desc
  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ lastActive: latestAt, events: events.slice(0, 5) })
}
