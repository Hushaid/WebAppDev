import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

export async function POST(request: NextRequest) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { submissionId } = body

  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 })
  }

  // Verify the submission belongs to this user
  const [submission] = await db
    .select({ submitterId: submissions.submitterId })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission || submission.submitterId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db
    .update(submissions)
    .set({ flaggedForReview: true, flaggedAt: new Date() })
    .where(eq(submissions.id, submissionId))

  logAudit({
    actorId: session.user.id,
    action: "flag_for_review",
    entityType: "submission",
    entityId: submissionId,
  }).catch(console.error)

  return NextResponse.json({ success: true })
}
