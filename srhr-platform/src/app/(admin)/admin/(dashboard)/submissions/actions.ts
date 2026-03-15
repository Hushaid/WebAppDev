"use server"

import { db } from "@/lib/db"
import {
  submissions,
  questionResponses,
  riskClassifications,
  questions,
} from "@/lib/db/schema"
import { users } from "@/lib/db/schema"
import { auditLog } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"

const PAGE_SIZE = 10

export async function getSubmissions(page: number = 1) {
  const offset = (page - 1) * PAGE_SIZE

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)

  const items = await db
    .select({
      id: submissions.id,
      submitterId: submissions.submitterId,
      submitterType: submissions.submitterType,
      gpsLat: submissions.gpsLat,
      gpsLng: submissions.gpsLng,
      flaggedForReview: submissions.flaggedForReview,
      createdAt: submissions.createdAt,
    })
    .from(submissions)
    .orderBy(desc(submissions.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  return {
    items,
    total: countResult.count,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(countResult.count / PAGE_SIZE),
  }
}

export async function getSubmissionDetail(submissionId: string) {
  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)

  if (!submission) return null

  const responses = await db
    .select({
      id: questionResponses.id,
      questionId: questionResponses.questionId,
      questionNumber: questions.questionNumber,
      responseValue: questionResponses.responseValue,
      score: questionResponses.score,
      createdAt: questionResponses.createdAt,
    })
    .from(questionResponses)
    .leftJoin(questions, eq(questionResponses.questionId, questions.id))
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
