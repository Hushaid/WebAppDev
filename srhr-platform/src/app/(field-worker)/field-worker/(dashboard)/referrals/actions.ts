"use server"

import { db } from "@/lib/db"
import { submissions, riskClassifications } from "@/lib/db/schema"
import { eq, desc, sql, or, and } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

const PAGE_SIZE = 15

export async function getHighRiskSubmissions(page: number = 1) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }

  const offset = (page - 1) * PAGE_SIZE

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
    .where(
      and(
        eq(submissions.submitterId, session.user.id),
        or(
          eq(riskClassifications.overallRiskLevel, "high"),
          eq(riskClassifications.overallRiskLevel, "medium"),
        ),
      ),
    )

  const items = await db
    .select({
      id: submissions.id,
      createdAt: submissions.createdAt,
      gpsLat: submissions.gpsLat,
      gpsLng: submissions.gpsLng,
      referred: submissions.referred,
      referredAt: submissions.referredAt,
      referralNote: submissions.referralNote,
      overallRiskLevel: riskClassifications.overallRiskLevel,
      aggregateScore: riskClassifications.aggregateScore,
    })
    .from(submissions)
    .innerJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
    .where(
      and(
        eq(submissions.submitterId, session.user.id),
        or(
          eq(riskClassifications.overallRiskLevel, "high"),
          eq(riskClassifications.overallRiskLevel, "medium"),
        ),
      ),
    )
    .orderBy(desc(submissions.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  return {
    items,
    total: countResult.count,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(countResult.count / PAGE_SIZE),
  }
}
