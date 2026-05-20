import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { questions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"
import { revalidatePath } from "next/cache"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!role || !["admin", "super_admin"].includes(role)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
  const { id } = await params
  const data = await request.json()
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.text !== undefined) updates.text = data.text
  if (data.options !== undefined) {
    updates.options = data.options
    updates.scoreWeight = Math.max(0, ...data.options.map((o: { score: number }) => o.score))
  }
  if (data.scoreWeight !== undefined && data.options === undefined) updates.scoreWeight = data.scoreWeight
  if (data.conditionalLogic !== undefined) updates.conditionalLogic = data.conditionalLogic
  await db.update(questions).set(updates).where(eq(questions.id, id))
  logAudit({ actorId: session?.user?.id, action: "update", entityType: "question", entityId: id, metadata: { fields: Object.keys(updates).filter((k) => k !== "updatedAt") } }).catch(console.error)
  revalidatePath("/admin/questionnaires")
  revalidatePath("/api/questionnaire/questions")
  return NextResponse.json({ success: true })
}

