import "server-only"

import { db } from "@/lib/db"
import { platformSettings } from "@/lib/db/schema"
import { inArray } from "drizzle-orm"
import {
  STI_THRESHOLDS,
  MATERNAL_THRESHOLDS,
  COMMUNITY_WELLBEING_THRESHOLDS,
  type ThresholdConfig,
} from "./thresholds"

/**
 * Load thresholds from the platform_settings table.
 * Falls back to hardcoded defaults if not set.
 * Server-only — must not be imported from client components.
 */
export async function loadThresholdsFromDB(): Promise<{
  sti: ThresholdConfig
  maternal: ThresholdConfig
  communityWellbeing: ThresholdConfig
}> {
  try {
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
