import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "super_admin") return NextResponse.json({ success: false, error: "Unauthorized: super admin only." }, { status: 403 })
  const body = await request.json()
  const radiusMeters = Number(body.radiusMeters)
  const windowMinutes = Number(body.windowMinutes)
  if (radiusMeters < 10 || radiusMeters > 10000) return NextResponse.json({ success: false, error: "Radius must be between 10 and 10,000 meters." }, { status: 400 })
  if (windowMinutes < 1 || windowMinutes > 1440) return NextResponse.json({ success: false, error: "Time window must be between 1 and 1,440 minutes (24 hours)." }, { status: 400 })
  await db.insert(platformSettings).values({ key: "dedup_radius_meters", value: String(radiusMeters) }).onConflictDoUpdate({ target: platformSettings.key, set: { value: String(radiusMeters), updatedAt: new Date() } })
  await db.insert(platformSettings).values({ key: "dedup_window_minutes", value: String(windowMinutes) }).onConflictDoUpdate({ target: platformSettings.key, set: { value: String(windowMinutes), updatedAt: new Date() } })
  logAudit({ actorId: session?.user?.id, action: "update", entityType: "platform_settings", metadata: { dedup_radius_meters: radiusMeters, dedup_window_minutes: windowMinutes } }).catch(console.error)
  revalidatePath("/admin/settings")
  return NextResponse.json({ success: true })
}

