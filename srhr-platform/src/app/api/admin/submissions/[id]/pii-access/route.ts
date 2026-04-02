import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auditLog } from "@/lib/db/schema"
import { auth } from "@/lib/auth"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await db.insert(auditLog).values({
    actorId: session.user.id,
    action: "pii_download",
    entityType: "submission",
    entityId: id,
    metadata: { accessedAt: new Date().toISOString() },
  })
  return NextResponse.json({ success: true })
}
