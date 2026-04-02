import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getPartnerPreferences } from "@/app/(admin)/admin/(dashboard)/settings/actions"
import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"
import { logAudit } from "@/lib/audit"

export async function GET() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const prefs = await getPartnerPreferences(session.user.id)
    return NextResponse.json(prefs)
  } catch {
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 })
  }

  const data = await request.json()
  const key = `partner_prefs_${session.user.id}`
  const value = JSON.stringify(data)

  await db
    .insert(platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedAt: new Date() },
    })

  logAudit({
    actorId: session.user.id,
    action: "update",
    entityType: "partner_preferences",
  }).catch(console.error)

  return NextResponse.json({ success: true })
}
