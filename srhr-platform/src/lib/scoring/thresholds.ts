export type RiskLevel = "low" | "medium" | "high"

export interface ThresholdConfig {
  low: [number, number]
  medium: [number, number]
  high: [number, number]
}

export const STI_THRESHOLDS: ThresholdConfig = {
  low: [1, 6],
  medium: [7, 12],
  high: [13, 18],
}

export const MATERNAL_THRESHOLDS: ThresholdConfig = {
  low: [1, 7],
  medium: [8, 14],
  high: [15, 22],
}

export const COMMUNITY_WELLBEING_THRESHOLDS: ThresholdConfig = {
  low: [1, 3],
  medium: [4, 6],
  high: [7, 9],
}

export function classifyRisk(
  score: number,
  thresholds: ThresholdConfig,
): RiskLevel {
  if (score >= thresholds.high[0]) return "high"
  if (score >= thresholds.medium[0]) return "medium"
  return "low"
}

/**
 * Load thresholds from the platform_settings table.
 * Falls back to hardcoded defaults if not set.
 */
export async function loadThresholdsFromDB(): Promise<{
  sti: ThresholdConfig
  maternal: ThresholdConfig
  communityWellbeing: ThresholdConfig
}> {
  try {
    const { db } = await import("@/lib/db")
    const { platformSettings } = await import("@/lib/db/schema")
    const { inArray } = await import("drizzle-orm")

    const rows = await db
      .select()
      .from(platformSettings)
      .where(
        inArray(platformSettings.key, [
          "threshold_sti",
          "threshold_maternal",
          "threshold_community_wellbeing",
        ]),
      )

    const rowMap = new Map(rows.map((r) => [r.key, r.value]))

    function parse(key: string, fallback: ThresholdConfig): ThresholdConfig {
      const raw = rowMap.get(key)
      if (!raw) return fallback
      try {
        return JSON.parse(raw) as ThresholdConfig
      } catch {
        return fallback
      }
    }

    return {
      sti: parse("threshold_sti", STI_THRESHOLDS),
      maternal: parse("threshold_maternal", MATERNAL_THRESHOLDS),
      communityWellbeing: parse("threshold_community_wellbeing", COMMUNITY_WELLBEING_THRESHOLDS),
    }
  } catch {
    return {
      sti: STI_THRESHOLDS,
      maternal: MATERNAL_THRESHOLDS,
      communityWellbeing: COMMUNITY_WELLBEING_THRESHOLDS,
    }
  }
}
