"use server"

import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"
import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import type { ThresholdConfig } from "@/lib/scoring/thresholds"

export async function getDedupSettings() {
  const [radiusRow] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, "dedup_radius_meters"))

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

  if (data.radiusMeters < 10 || data.radiusMeters > 10000) {
    return { success: false as const, error: "Radius must be between 10 and 10,000 meters." }
  }
  if (data.windowMinutes < 1 || data.windowMinutes > 60) {
    return { success: false as const, error: "Time window must be between 1 and 60 minutes." }
  }

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

// --- Risk Threshold Settings ---

const THRESHOLD_KEYS = [
  "threshold_sti",
  "threshold_maternal",
  "threshold_community_wellbeing",
] as const

const DEFAULT_THRESHOLDS: Record<string, ThresholdConfig> = {
  threshold_sti: { low: [1, 6], medium: [7, 12], high: [13, 18] },
  threshold_maternal: { low: [1, 7], medium: [8, 14], high: [15, 22] },
  threshold_community_wellbeing: { low: [1, 3], medium: [4, 6], high: [7, 9] },
}

export async function getThresholdSettings() {
  const rows = await db
    .select()
    .from(platformSettings)
    .where(inArray(platformSettings.key, [...THRESHOLD_KEYS]))

  const rowMap = new Map(rows.map((r) => [r.key, r.value]))

  function parse(key: string): ThresholdConfig {
    const raw = rowMap.get(key)
    if (!raw) return DEFAULT_THRESHOLDS[key]
    try {
      return JSON.parse(raw) as ThresholdConfig
    } catch {
      return DEFAULT_THRESHOLDS[key]
    }
  }

  return {
    sti: parse("threshold_sti"),
    maternal: parse("threshold_maternal"),
    communityWellbeing: parse("threshold_community_wellbeing"),
  }
}

export async function updateThresholdSettings(data: {
  category: "sti" | "maternal" | "communityWellbeing"
  thresholds: ThresholdConfig
}) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  const keyMap: Record<string, string> = {
    sti: "threshold_sti",
    maternal: "threshold_maternal",
    communityWellbeing: "threshold_community_wellbeing",
  }

  const key = keyMap[data.category]
  if (!key) return { success: false as const, error: "Invalid category." }

  // Validate: low min < medium min < high min, no negative values
  const { low, medium, high } = data.thresholds
  if (low[0] < 0 || medium[0] < 0 || high[0] < 0) {
    return { success: false as const, error: "Threshold values cannot be negative." }
  }
  if (low[1] >= medium[0] || medium[1] >= high[0]) {
    return { success: false as const, error: "Threshold ranges must not overlap. Each level's max must be less than the next level's min." }
  }

  const value = JSON.stringify(data.thresholds)

  await db
    .insert(platformSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value, updatedAt: new Date() },
    })

  logAudit({
    actorId: session?.user?.id,
    action: "update",
    entityType: "platform_settings",
    metadata: { category: data.category, thresholds: data.thresholds },
  }).catch(console.error)

  revalidatePath("/admin/settings")
  return { success: true as const }
}

// --- Partner Alert Preferences ---

export async function getPartnerPreferences(userId: string) {
  const [row] = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, `partner_prefs_${userId}`))

  if (!row) {
    return {
      highRiskAlerts: true,
      hotspotAlerts: true,
      climateAlerts: true,
      weeklyDigest: true,
      monthlyReport: true,
      minimumRiskLevel: "medium",
    }
  }

  try {
    return JSON.parse(row.value)
  } catch {
    return {
      highRiskAlerts: true,
      hotspotAlerts: true,
      climateAlerts: true,
      weeklyDigest: true,
      monthlyReport: true,
      minimumRiskLevel: "medium",
    }
  }
}

export async function updatePartnerPreferences(data: {
  highRiskAlerts: boolean
  hotspotAlerts: boolean
  climateAlerts: boolean
  weeklyDigest: boolean
  monthlyReport: boolean
  minimumRiskLevel: string
}) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) return { success: false as const, error: "Not authenticated." }

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

  revalidatePath("/partners/preferences")
  return { success: true as const }
}
