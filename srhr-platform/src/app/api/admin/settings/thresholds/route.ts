import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"
import type { ThresholdConfig } from "@/lib/scoring/thresholds"

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "super_admin") return NextResponse.json({ success: false, error: "Unauthorized: super admin only." }, { status: 403 })
  const body = await request.json()
  const category = body.category as "sti" | "maternal" | "communityWellbeing"
  const thresholds = body.thresholds as ThresholdConfig
  const keyMap: Record<string, string> = { sti: "threshold_sti", maternal: "threshold_maternal", communityWellbeing: "threshold_community_wellbeing" }
  const key = keyMap[category]
  if (!key) return NextResponse.json({ success: false, error: "Invalid category." }, { status: 400 })
  const { low, medium, high } = thresholds
  if (low[0] < 0 || medium[0] < 0 || high[0] < 0) return NextResponse.json({ success: false, error: "Threshold values cannot be negative." }, { status: 400 })
  if (low[1] >= medium[0] || medium[1] >= high[0]) return NextResponse.json({ success: false, error: "Threshold ranges must not overlap. Each level's max must be less than the next level's min." }, { status: 400 })
  const value = JSON.stringify(thresholds)
  await db.insert(platformSettings).values({ key, value }).onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedAt: new Date() } })
  logAudit({ actorId: session?.user?.id, action: "update", entityType: "platform_settings", metadata: { category, thresholds } }).catch(console.error)
  revalidatePath("/admin/settings")
  return NextResponse.json({ success: true })
}

