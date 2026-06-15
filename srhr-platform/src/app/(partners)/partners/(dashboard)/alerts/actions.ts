"use server"

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { eq, desc, sql, and, isNotNull, gte, lte } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

const PAGE_SIZE = 10

export async function getPartnerAlerts(page: number = 1) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id)
    return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }

  const offset = (page - 1) * PAGE_SIZE

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(eq(alerts.recipientId, session.user.id))

  const items = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      riskLevel: alerts.riskLevel,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      createdAt: alerts.createdAt,
    })
    .from(alerts)
    .where(eq(alerts.recipientId, session.user.id))
    .orderBy(desc(alerts.createdAt))
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

export async function updatePartnerAlertStatus(
  alertId: string,
  status: "actioned" | "dismissed",
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) return

  // Verify this alert belongs to the current user
  const [alertRow] = await db
    .select({ recipientId: alerts.recipientId, title: alerts.title, message: alerts.message })
    .from(alerts)
    .where(eq(alerts.id, alertId))
    .limit(1)

  if (!alertRow || alertRow.recipientId !== session.user.id) return

  const updateData: Record<string, unknown> = { status, updatedAt: new Date() }
  if (status === "actioned") updateData.actionedAt = new Date()

  // Propagate to ALL sibling recipient alerts (same event, different recipients)
  // so resolution/dismissal reflects for all users. Exclude system-level rows
  // (recipientId null) so super-admin review queue is not affected.
  await db
    .update(alerts)
    .set(updateData)
    .where(
      and(
        eq(alerts.title, alertRow.title),
        alertRow.message
          ? eq(alerts.message, alertRow.message)
          : sql`${alerts.message} IS NULL`,
        isNotNull(alerts.recipientId),
      ),
    )

  logAudit({
    actorId: session.user.id,
    action: `alert_${status}`,
    entityType: "alert",
    entityId: alertId,
  }).catch(console.error)

  revalidatePath("/partners/alerts")
}

export async function getPartnerAlertSummary() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return {
      thisWeek: 0,
      lastWeek: 0,
      thisMonth: 0,
      lastMonth: 0,
      thisWeekHigh: 0,
      lastMonthHigh: 0,
    }
  }

  const now = new Date()

  // Week boundaries (Mon–Sun)
  const dayOfWeek = now.getDay() // 0 = Sun, 1 = Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysFromMonday)
  thisMonday.setHours(0, 0, 0, 0)

  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)

  const lastSunday = new Date(thisMonday)
  lastSunday.setMilliseconds(-1) // 1ms before this Monday = last Sunday 23:59:59.999

  // Month boundaries
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const countWhere = (start: Date, end: Date, highOnly = false) => {
    const conditions = [
      eq(alerts.recipientId, session.user.id),
      gte(alerts.createdAt, start),
      lte(alerts.createdAt, end),
    ]
    if (highOnly) conditions.push(eq(alerts.riskLevel, "high"))
    return and(...conditions)
  }

  const [
    [thisWeekRow],
    [lastWeekRow],
    [thisMonthRow],
    [lastMonthRow],
    [thisWeekHighRow],
    [lastMonthHighRow],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(countWhere(thisMonday, now)),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(countWhere(lastMonday, lastSunday)),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(countWhere(thisMonthStart, thisMonthEnd)),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(countWhere(lastMonthStart, lastMonthEnd)),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(countWhere(thisMonday, now, true)),
    db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(countWhere(lastMonthStart, lastMonthEnd, true)),
  ])

  return {
    thisWeek: thisWeekRow.count,
    lastWeek: lastWeekRow.count,
    thisMonth: thisMonthRow.count,
    lastMonth: lastMonthRow.count,
    thisWeekHigh: thisWeekHighRow.count,
    lastMonthHigh: lastMonthHighRow.count,
  }
}
