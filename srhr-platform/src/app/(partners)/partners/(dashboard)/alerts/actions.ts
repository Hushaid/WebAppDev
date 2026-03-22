"use server"

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { eq, desc, sql, and } from "drizzle-orm"
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

  // Propagate to ALL sibling alerts (same event, different recipients)
  // so resolution/dismissal reflects for all users
  await db
    .update(alerts)
    .set(updateData)
    .where(
      and(
        eq(alerts.title, alertRow.title),
        alertRow.message
          ? eq(alerts.message, alertRow.message)
          : sql`${alerts.message} IS NULL`,
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
