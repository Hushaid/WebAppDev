"use server"

import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

const PAGE_SIZE = 10

export async function getFieldWorkerSubmissions(page: number = 1) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }

  const offset = (page - 1) * PAGE_SIZE

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(eq(submissions.submitterId, session.user.id))

  const items = await db
    .select({
      id: submissions.id,
      submitterType: submissions.submitterType,
      gpsLat: submissions.gpsLat,
      gpsLng: submissions.gpsLng,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(eq(submissions.submitterId, session.user.id))
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
