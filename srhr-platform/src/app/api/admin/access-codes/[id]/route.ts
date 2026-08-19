import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { fieldWorkerCodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

async function requireSuperAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === "super_admin" ? session : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin(request)
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
  const { id } = await params
  await db.update(fieldWorkerCodes).set({ revoked: true }).where(eq(fieldWorkerCodes.id, id))
  logAudit({ actorId: session.user.id, action: "revoke", entityType: "access_code", entityId: id }).catch(console.error)
  revalidatePath("/admin/access-codes")
  return NextResponse.json({ success: true })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin(request)
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
  const { id } = await params
  await db.delete(fieldWorkerCodes).where(eq(fieldWorkerCodes.id, id))
  logAudit({ actorId: session.user.id, action: "delete", entityType: "access_code", entityId: id }).catch(console.error)
  revalidatePath("/admin/access-codes")
  return NextResponse.json({ success: true })
}

