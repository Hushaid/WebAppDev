"use server"

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"

const PAGE_SIZE = 10

export async function getAlerts(page: number = 1) {
  const offset = (page - 1) * PAGE_SIZE

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(alerts)

  const items = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      riskLevel: alerts.riskLevel,
      status: alerts.status,
      title: alerts.title,
      message: alerts.message,
      sentAt: alerts.sentAt,
      createdAt: alerts.createdAt,
      recipientName: users.name,
      recipientEmail: users.email,
    })
    .from(alerts)
    .leftJoin(users, eq(alerts.recipientId, users.id))
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

export async function updateAlertStatus(
  alertId: string,
  status: "sent" | "opened" | "actioned" | "dismissed",
) {
  const updateData: Record<string, unknown> = { status }

  if (status === "sent") updateData.sentAt = new Date()
  if (status === "opened") updateData.openedAt = new Date()
  if (status === "actioned") updateData.actionedAt = new Date()

  await db.update(alerts).set(updateData).where(eq(alerts.id, alertId))
}
