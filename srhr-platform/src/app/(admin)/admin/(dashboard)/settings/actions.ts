"use server"

import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

export async function getDedupSettings() {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, "dedup_radius_meters"))

  const [radiusRow] = rows
  const [windowRow] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, "dedup_window_minutes"))

  return {
    radiusMeters: radiusRow ? parseInt(radiusRow.value, 10) : 100,
    windowMinutes: windowRow ? parseInt(windowRow.value, 10) : 2,
  }
}

export async function updateDedupSettings(data: {
  radiusMeters: number
  windowMinutes: number
}) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  // Validate ranges
  if (data.radiusMeters < 10 || data.radiusMeters > 10000) {
    return { success: false as const, error: "Radius must be between 10 and 10,000 meters." }
  }
  if (data.windowMinutes < 1 || data.windowMinutes > 60) {
    return { success: false as const, error: "Time window must be between 1 and 60 minutes." }
  }

  // Upsert both settings
  await db
    .insert(platformSettings)
    .values({ key: "dedup_radius_meters", value: String(data.radiusMeters) })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: String(data.radiusMeters), updatedAt: new Date() },
    })

  await db
    .insert(platformSettings)
    .values({ key: "dedup_window_minutes", value: String(data.windowMinutes) })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: String(data.windowMinutes), updatedAt: new Date() },
    })

  logAudit({
    actorId: session?.user?.id,
    action: "update",
    entityType: "platform_settings",
    metadata: {
      dedup_radius_meters: data.radiusMeters,
      dedup_window_minutes: data.windowMinutes,
    },
  }).catch(console.error)

  revalidatePath("/admin/settings")
  return { success: true as const }
}
