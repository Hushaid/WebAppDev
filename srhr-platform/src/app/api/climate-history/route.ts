import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { floodRiskSnapshots } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get("date")

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date. Use YYYY-MM-DD." }, { status: 400 })
  }

  const rows = await db
    .select()
    .from(floodRiskSnapshots)
    .where(eq(floodRiskSnapshots.snapshotDate, dateParam))

  if (rows.length === 0) {
    return NextResponse.json({ available: false, date: dateParam, predictions: [] })
  }

  return NextResponse.json({
    available: true,
    date: dateParam,
    predictions: rows.map((r) => ({
      lga_id: r.lgaId,
      prediction_date: r.snapshotDate,
      flood_probability: parseFloat(r.floodProbability),
      risk_level: r.riskLevel,
      compound_score: r.compoundScore != null ? parseFloat(r.compoundScore) : null,
      compound_risk_level: r.compoundRiskLevel,
    })),
  })
}
