"use server"

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function getAlerts() {
  return db
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
    .limit(100)
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
