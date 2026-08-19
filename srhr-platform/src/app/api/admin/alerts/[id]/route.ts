import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { alerts } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  const { id } = await params
  const body = await request.json()
  const status = body.status as "sent" | "opened" | "actioned" | "dismissed"
  const note = typeof body.note === "string" ? body.note : undefined
  const updateData: Record<string, unknown> = { status, updatedAt: new Date() }
  if (status === "sent") updateData.sentAt = new Date()
  if (status === "opened") updateData.openedAt = new Date()
  if (status === "actioned") updateData.actionedAt = new Date()
  if (note?.trim()) updateData.adminNote = note.trim()
  if (status === "actioned" || status === "dismissed") {
    const [alertRow] = await db.select({ title: alerts.title, message: alerts.message }).from(alerts).where(eq(alerts.id, id)).limit(1)
    if (alertRow) {
      await db.update(alerts).set(updateData).where(and(eq(alerts.title, alertRow.title), alertRow.message ? eq(alerts.message, alertRow.message) : sql`${alerts.message} IS NULL`))
    }
  } else {
    await db.update(alerts).set(updateData).where(eq(alerts.id, id))
  }
  logAudit({ actorId: session?.user?.id, action: `alert_${status}`, entityType: "alert", entityId: id, metadata: note?.trim() ? { note: note.trim() } : undefined }).catch(console.error)
  revalidatePath("/admin/alerts")
  revalidatePath("/partners/alerts")
  return NextResponse.json({ success: true })
}

