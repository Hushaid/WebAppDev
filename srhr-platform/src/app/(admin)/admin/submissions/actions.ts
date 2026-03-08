"use server"

import { db } from "@/lib/db"
import {
  submissions,
  questionResponses,
  riskClassifications,
} from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { auditLog } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function getSubmissions() {
  return db
    .select({
      id: submissions.id,
      submitterId: submissions.submitterId,
      submitterType: submissions.submitterType,
      gpsLat: submissions.gpsLat,
      gpsLng: submissions.gpsLng,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .orderBy(desc(submissions.createdAt))
    .limit(100)
}

export async function getSubmissionDetail(submissionId: string) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) return null

  const responses = await db
    .select()
    .from(questionResponses)
    .where(eq(questionResponses.submissionId, submissionId))

  const [classification] = await db
    .select()
    .from(riskClassifications)
    .where(eq(riskClassifications.submissionId, submissionId))
    .limit(1)

  const [submitter] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, submission.submitterId))
    .limit(1)

  return {
    submission,
    responses,
    classification: classification ?? null,
    submitter: submitter ?? null,
  }
}

export async function logPiiAccess(actorId: string, submissionId: string) {
  await db.insert(auditLog).values({
    actorId,
    action: "pii_download",
    entityType: "submission",
    entityId: submissionId,
    metadata: { accessedAt: new Date().toISOString() },
  })
}
