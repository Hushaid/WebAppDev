import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { healthFacilities } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

/**
 * GET /api/facilities?lat=...&lng=...&limit=5
 * Returns nearest health facilities sorted by distance.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lng = searchParams.get("lng")
  const limit = parseInt(searchParams.get("limit") ?? "5", 10)

  if (!lat || !lng) {
    // No GPS — return all facilities (limited)
    const facilities = await db
      .select()
      .from(healthFacilities)
      .limit(limit)

    return NextResponse.json(facilities)
  }

  // Use Haversine approximation for distance sorting
  // PostGIS ST_Distance would be better but requires geometry column;
  // this works with plain lat/lng numeric columns
  const facilities = await db
    .select({
      id: healthFacilities.id,
      name: healthFacilities.name,
      type: healthFacilities.type,
      address: healthFacilities.address,
      ward: healthFacilities.ward,
      lga: healthFacilities.lga,
      gpsLat: healthFacilities.gpsLat,
      gpsLng: healthFacilities.gpsLng,
      distance_km: sql<number>`(
        6371 * acos(
          cos(radians(${parseFloat(lat)})) *
          cos(radians(${healthFacilities.gpsLat}::double precision)) *
          cos(radians(${healthFacilities.gpsLng}::double precision) - radians(${parseFloat(lng)})) +
          sin(radians(${parseFloat(lat)})) *
          sin(radians(${healthFacilities.gpsLat}::double precision))
        )
      )`.as("distance_km"),
    })
    .from(healthFacilities)
    .orderBy(sql`distance_km`)
    .limit(limit)

  return NextResponse.json(facilities)
}
