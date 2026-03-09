import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { desc, eq } from "drizzle-orm"

/**
 * GET /api/alerts
 * Returns alerts for the current user (de-identified, no PII).
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  let query = db
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

  // Filter by recipient if user is authenticated
  if (session?.user?.id) {
    query = query.where(eq(alerts.recipientId, session.user.id)) as typeof query
  }

  const alertList = await query
    .orderBy(desc(alerts.createdAt))
    .limit(100)

  return NextResponse.json(alertList)
}
