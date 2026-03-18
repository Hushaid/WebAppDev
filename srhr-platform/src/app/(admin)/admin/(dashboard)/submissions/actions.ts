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
import { eq, desc, sql, and, gte, lte, inArray } from "drizzle-orm"

const PAGE_SIZE = 10

export interface SubmissionFilters {
  submitterType?: string
  riskLevel?: string
  ageGroup?: string
  dateFrom?: string
  dateTo?: string
  flagged?: string
}

async function getSubmissionIdsByAgeGroup(ageGroup: string): Promise<string[]> {
  // Q5 is the age group question — find its UUID, then filter responses
  const [q5] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.questionNumber, "Q5"))
    .limit(1)

  if (!q5) return []

  const rows = await db
    .select({ submissionId: questionResponses.submissionId })
    .from(questionResponses)
    .where(
      and(
        eq(questionResponses.questionId, q5.id),
        eq(questionResponses.responseValue, ageGroup),
      ),
    )

  return rows.map((r) => r.submissionId)
}

export async function getSubmissions(page: number = 1, filters: SubmissionFilters = {}) {
  const offset = (page - 1) * PAGE_SIZE

  // Build WHERE conditions
  const conditions = []

  if (filters.submitterType && filters.submitterType !== "all") {
    conditions.push(eq(submissions.submitterType, filters.submitterType as "field_worker" | "personal_user"))
  }

  if (filters.flagged === "true") {
    conditions.push(eq(submissions.flaggedForReview, true))
  }

  if (filters.dateFrom) {
    conditions.push(gte(submissions.createdAt, new Date(filters.dateFrom)))
  }

  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo)
    toDate.setHours(23, 59, 59, 999)
    conditions.push(lte(submissions.createdAt, toDate))
  }

  // Age group filter — requires subquery through question_responses
  if (filters.ageGroup && filters.ageGroup !== "all") {
    const ids = await getSubmissionIdsByAgeGroup(filters.ageGroup)
    if (ids.length === 0) {
      return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 }
    }
    conditions.push(inArray(submissions.id, ids))
  }

  // Risk level filter requires joining with riskClassifications
  const needsRiskJoin = filters.riskLevel && filters.riskLevel !== "all"

  if (needsRiskJoin) {
    conditions.push(eq(riskClassifications.overallRiskLevel, filters.riskLevel! as "low" | "medium" | "high"))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  if (needsRiskJoin) {
    // Count with risk join
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(submissions)
      .innerJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
      .where(whereClause)

    const items = await db
      .select({
        id: submissions.id,
        submitterId: submissions.submitterId,
        submitterType: submissions.submitterType,
        gpsLat: submissions.gpsLat,
        gpsLng: submissions.gpsLng,
        flaggedForReview: submissions.flaggedForReview,
        createdAt: submissions.createdAt,
        overallRiskLevel: riskClassifications.overallRiskLevel,
      })
      .from(submissions)
      .innerJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
      .where(whereClause)
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

  // No risk join needed — left join to still get risk level for display
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(whereClause)

  const items = await db
    .select({
      id: submissions.id,
      submitterId: submissions.submitterId,
      submitterType: submissions.submitterType,
      gpsLat: submissions.gpsLat,
      gpsLng: submissions.gpsLng,
      flaggedForReview: submissions.flaggedForReview,
      createdAt: submissions.createdAt,
      overallRiskLevel: riskClassifications.overallRiskLevel,
    })
    .from(submissions)
    .leftJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
    .where(whereClause)
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
