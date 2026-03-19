import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { submissions, platformSettings } from "@/lib/db/schema"
import { eq, and, gte, sql } from "drizzle-orm"

const DEFAULT_DEDUP_WINDOW_MS = 480 * 60 * 1000 // 8 hours
const DEFAULT_DEDUP_RADIUS_METERS = 100

function metersToDegrees(meters: number) {
  return meters / 111_320
}

async function getDedupConfig() {
  try {
    const rows = await db
      .select()
      .from(platformSettings)
      .where(
        sql`${platformSettings.key} IN ('dedup_radius_meters', 'dedup_window_minutes')`,
      )

    let radiusMeters = DEFAULT_DEDUP_RADIUS_METERS
    let windowMs = DEFAULT_DEDUP_WINDOW_MS

    for (const row of rows) {
      if (row.key === "dedup_radius_meters") {
        radiusMeters = parseInt(row.value, 10) || DEFAULT_DEDUP_RADIUS_METERS
      } else if (row.key === "dedup_window_minutes") {
        windowMs = (parseInt(row.value, 10) || 2) * 60 * 1000
      }
    }

    return { proximityDeg: metersToDegrees(radiusMeters), windowMs }
  } catch {
    return {
      proximityDeg: metersToDegrees(DEFAULT_DEDUP_RADIUS_METERS),
      windowMs: DEFAULT_DEDUP_WINDOW_MS,
    }
  }
}

/**
 * GET /api/submissions/dedup-check?submitterId=...&lat=...&lng=...
 *
 * Checks if a field worker has submitted from this GPS location within the
 * configured time window. Used to block the assessment page before it starts.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const submitterId = searchParams.get("submitterId")
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lng = parseFloat(searchParams.get("lng") ?? "")

  if (!submitterId || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "submitterId, lat, and lng are required" }, { status: 400 })
  }

  const dedup = await getDedupConfig()
  const windowStart = new Date(Date.now() - dedup.windowMs)
  const windowMinutes = Math.round(dedup.windowMs / 60000)

  const [recent] = await db
    .select({ id: submissions.id, createdAt: submissions.createdAt })
    .from(submissions)
    .where(
      and(
        eq(submissions.submitterId, submitterId),
        eq(submissions.submitterType, "field_worker"),
        gte(submissions.createdAt, windowStart),
        sql`abs(${submissions.gpsLat}::double precision - ${lat}) < ${dedup.proximityDeg}`,
        sql`abs(${submissions.gpsLng}::double precision - ${lng}) < ${dedup.proximityDeg}`,
      ),
    )
    .limit(1)

  if (recent) {
    const blockedUntil = new Date(recent.createdAt.getTime() + dedup.windowMs)
    return NextResponse.json({
      isDuplicate: true,
      blockedUntil: blockedUntil.toISOString(),
      windowMinutes,
    })
  }

  return NextResponse.json({ isDuplicate: false })
}
