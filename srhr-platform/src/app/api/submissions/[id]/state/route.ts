import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { submissions, riskClassifications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const [submission] = await db
    .select({
      submitterId: submissions.submitterId,
      flaggedForReview: submissions.flaggedForReview,
      referred: submissions.referred,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1)

  if (!submission || submission.submitterId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const [risk] = await db
    .select({ overallRiskLevel: riskClassifications.overallRiskLevel })
    .from(riskClassifications)
    .where(eq(riskClassifications.submissionId, id))
    .limit(1)

  return NextResponse.json({
    flaggedForReview: submission.flaggedForReview,
    referred: submission.referred,
    overallRiskLevel: risk?.overallRiskLevel ?? null,
  })
}
