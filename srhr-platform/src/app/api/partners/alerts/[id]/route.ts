import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const status = body.status as "actioned" | "dismissed"
  const [alertRow] = await db.select({ recipientId: alerts.recipientId, title: alerts.title, message: alerts.message }).from(alerts).where(eq(alerts.id, id)).limit(1)
  if (!alertRow || alertRow.recipientId !== session.user.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  const updateData: Record<string, unknown> = { status, updatedAt: new Date() }
  if (status === "actioned") updateData.actionedAt = new Date()
  await db.update(alerts).set(updateData).where(and(eq(alerts.title, alertRow.title), alertRow.message ? eq(alerts.message, alertRow.message) : sql`${alerts.message} IS NULL`))
  logAudit({ actorId: session.user.id, action: `alert_${status}`, entityType: "alert", entityId: id }).catch(console.error)
  revalidatePath("/partners/alerts")
  return NextResponse.json({ success: true })
}

