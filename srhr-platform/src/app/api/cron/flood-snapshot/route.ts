import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { floodRiskSnapshots } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

const CLIMATE_BACKEND_URL = process.env.CLIMATE_BACKEND_URL || "http://localhost:8002"

export async function GET(request: Request) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const res = await fetch(`${CLIMATE_BACKEND_URL}/api/v1/flood-risk`, {
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json({ error: "Climate service unavailable" }, { status: 502 })
    }

    const data = await res.json()
    const predictions: {
      lga_id: string
      flood_probability: number
      risk_level: string
      compound_score: number | null
      compound_risk_level: string | null
    }[] = data.predictions ?? []

    if (predictions.length === 0) {
      return NextResponse.json({ saved: 0, message: "No predictions returned" })
    }

    const today = new Date().toISOString().slice(0, 10)

    // Upsert — if snapshot for today already exists, update it
    await db
      .insert(floodRiskSnapshots)
      .values(
        predictions.map((p) => ({
          snapshotDate: today,
          lgaId: p.lga_id,
          floodProbability: String(p.flood_probability),
          riskLevel: p.risk_level,
          compoundScore: p.compound_score != null ? String(p.compound_score) : null,
          compoundRiskLevel: p.compound_risk_level ?? null,
        }))
      )
      .onConflictDoUpdate({
        target: [floodRiskSnapshots.snapshotDate, floodRiskSnapshots.lgaId],
        set: {
          floodProbability: sql`excluded.flood_probability`,
          riskLevel: sql`excluded.risk_level`,
          compoundScore: sql`excluded.compound_score`,
          compoundRiskLevel: sql`excluded.compound_risk_level`,
          createdAt: sql`now()`,
        },
      })

    return NextResponse.json({ saved: predictions.length, date: today })
  } catch (error) {
    console.error("Flood snapshot cron error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
