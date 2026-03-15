"use server"

import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function getPartnerAlerts() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) return []

  return db
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
    .limit(100)
}

export async function updatePartnerAlertStatus(
  alertId: string,
  status: "actioned" | "dismissed",
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) return

  // Verify this alert belongs to the current user
  const [alert] = await db
    .select({ recipientId: alerts.recipientId })
    .from(alerts)
    .where(eq(alerts.id, alertId))
    .limit(1)

  if (!alert || alert.recipientId !== session.user.id) return

  const updateData: Record<string, unknown> = { status, updatedAt: new Date() }
  if (status === "actioned") updateData.actionedAt = new Date()

  await db.update(alerts).set(updateData).where(eq(alerts.id, alertId))

  logAudit({
    actorId: session.user.id,
    action: `alert_${status}`,
    entityType: "alert",
    entityId: alertId,
  }).catch(console.error)

  revalidatePath("/partners/alerts")
}
