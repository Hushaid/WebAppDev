import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { desc } from "drizzle-orm"

/**
 * GET /api/alerts
 * Returns alerts for the current user (de-identified, no PII).
 */
export async function GET() {
  // TODO: filter by current user's recipientId from session
  const alertList = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      risk_level: alerts.riskLevel,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      created_at: alerts.createdAt,
    })
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(100)

  return NextResponse.json(alertList)
}
