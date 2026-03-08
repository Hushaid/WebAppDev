import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { submissions } from "@/lib/db/schema"
import { eq, and, gte, desc } from "drizzle-orm"

/**
 * GET /api/submissions/check?submitterId=...&cooldownHours=24
 *
 * Checks if a personal user has submitted within the cooldown period.
 * Returns { canSubmit, lastSubmissionAt, cooldownEndsAt }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const submitterId = searchParams.get("submitterId")
  const cooldownHours = parseInt(searchParams.get("cooldownHours") ?? "24", 10)

  if (!submitterId) {
    return NextResponse.json(
      { error: "submitterId is required" },
      { status: 400 },
    )
  }

  const cooldownStart = new Date(Date.now() - cooldownHours * 60 * 60 * 1000)

  const [recentSubmission] = await db
    .select({
      id: submissions.id,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .where(
      and(
        eq(submissions.submitterId, submitterId),
        eq(submissions.submitterType, "personal_user"),
        gte(submissions.createdAt, cooldownStart),
      ),
    )
    .orderBy(desc(submissions.createdAt))
    .limit(1)

  if (recentSubmission) {
    const cooldownEndsAt = new Date(
      recentSubmission.createdAt.getTime() + cooldownHours * 60 * 60 * 1000,
    )
    return NextResponse.json({
      canSubmit: false,
      lastSubmissionAt: recentSubmission.createdAt.toISOString(),
      cooldownEndsAt: cooldownEndsAt.toISOString(),
    })
  }

  return NextResponse.json({ canSubmit: true })
}
