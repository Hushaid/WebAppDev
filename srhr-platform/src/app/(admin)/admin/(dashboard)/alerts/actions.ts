"use server"

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { eq, desc, sql, and, isNull, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

const PAGE_SIZE = 10

export async function getAlerts(page: number = 1) {
  const offset = (page - 1) * PAGE_SIZE

  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const userId = session?.user?.id
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (!userId) return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }

  // Super-admins see their own alerts + system-level pending_review alerts (recipientId null)
  const whereClause = callerRole === "super_admin"
    ? or(eq(alerts.recipientId, userId), isNull(alerts.recipientId))
    : eq(alerts.recipientId, userId)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(whereClause)

  const items = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      riskLevel: alerts.riskLevel,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      adminNote: alerts.adminNote,
      sentAt: alerts.sentAt,
      createdAt: alerts.createdAt,
      recipientName: users.name,
      recipientEmail: users.email,
    })
    .from(alerts)
    .leftJoin(users, eq(alerts.recipientId, users.id))
    .where(whereClause)
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

export async function getPendingReviewCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)
    .where(eq(alerts.status, "pending_review"))
  return result?.count ?? 0
}

export async function updateAlertStatus(
  alertId: string,
  status: "sent" | "opened" | "actioned" | "dismissed" | "pending_review",
  note?: string,
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })

  const updateData: Record<string, unknown> = { status, updatedAt: new Date() }

  if (status === "sent") updateData.sentAt = new Date()
  if (status === "opened") updateData.openedAt = new Date()
  if (status === "actioned") updateData.actionedAt = new Date()
  if (note?.trim()) updateData.adminNote = note.trim()

  // For actioned/dismissed, propagate to ALL sibling alerts (same event, different recipients)
  // so that when one admin resolves/dismisses, it's done for everyone
  if (status === "actioned" || status === "dismissed") {
    // Look up the alert to find its title + message (the shared key across recipients)
    const [alertRow] = await db
      .select({ title: alerts.title, message: alerts.message })
      .from(alerts)
      .where(eq(alerts.id, alertId))
      .limit(1)

    if (alertRow) {
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
    }
  } else {
    // For other statuses (sent, opened), only update the individual alert
    await db.update(alerts).set(updateData).where(eq(alerts.id, alertId))
  }

  logAudit({
    actorId: session?.user?.id,
    action: `alert_${status}`,
    entityType: "alert",
    entityId: alertId,
    metadata: note?.trim() ? { note: note.trim() } : undefined,
  }).catch(console.error)

  revalidatePath("/admin/alerts")
  revalidatePath("/partners/alerts")
}
