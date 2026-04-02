import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { alerts, auditLog, climateDatasets, fieldWorkerCodes, subjects, submissions, users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  const body = await request.json()

  if (body.type === "details") {
    if (callerRole !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only a super admin can edit user details." }, { status: 403 })
    }
    await db.update(users).set({
      name: body.name || undefined,
      phone: body.phone || null,
      alternatePhone: body.alternatePhone || null,
      homeAddress: body.homeAddress || null,
      sex: body.sex || null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
    logAudit({ actorId: session?.user?.id, action: "update", entityType: "user", entityId: userId, metadata: { fields: ["name", "phone", "alternatePhone", "homeAddress", "sex"] } }).catch(console.error)
  } else if (body.type === "role") {
    if (callerRole !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only a super admin can change user roles." }, { status: 403 })
    }
    await db.update(users).set({ role: body.role, updatedAt: new Date() }).where(eq(users.id, userId))
    logAudit({ actorId: session?.user?.id, action: "update_role", entityType: "user", entityId: userId, metadata: { newRole: body.role } }).catch(console.error)
  } else if (body.type === "status") {
    if (callerRole !== "super_admin") {
      return NextResponse.json({ success: false, error: "Only a super admin can change user status." }, { status: 403 })
    }
    await db.update(users).set({ status: body.status, updatedAt: new Date() }).where(eq(users.id, userId))
    logAudit({ actorId: session?.user?.id, action: "update_status", entityType: "user", entityId: userId, metadata: { newStatus: body.status } }).catch(console.error)
  } else {
    return NextResponse.json({ success: false, error: "Invalid update type." }, { status: 400 })
  }

  revalidatePath("/admin/users")
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  const callerId = session?.user?.id

  if (callerRole !== "super_admin") {
    return NextResponse.json({ success: false, error: "Only a super admin can delete users." }, { status: 403 })
  }
  if (callerId === userId) {
    return NextResponse.json({ success: false, error: "You cannot delete your own account." }, { status: 400 })
  }
  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!target) {
    return NextResponse.json({ success: false, error: "User not found." }, { status: 404 })
  }

  await db.delete(alerts).where(eq(alerts.recipientId, userId))
  await db.delete(submissions).where(eq(submissions.submitterId, userId))
  await db.delete(fieldWorkerCodes).where(eq(fieldWorkerCodes.issuedBy, userId))
  await db.update(subjects).set({ createdBy: null }).where(eq(subjects.createdBy, userId))
  await db.update(auditLog).set({ actorId: null }).where(eq(auditLog.actorId, userId))
  await db.update(climateDatasets).set({ uploadedBy: null }).where(eq(climateDatasets.uploadedBy, userId))
  await db.update(fieldWorkerCodes).set({ issuedTo: null }).where(eq(fieldWorkerCodes.issuedTo, userId))
  await db.delete(users).where(eq(users.id, userId))

  logAudit({ actorId: callerId, action: "delete", entityType: "user", entityId: userId, metadata: { deletedRole: target.role, deletedEmail: target.email } }).catch(console.error)
  revalidatePath("/admin/users")
  return NextResponse.json({ success: true })
}

