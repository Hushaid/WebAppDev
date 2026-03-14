"use server"

import { db } from "@/lib/db"
import { questions, questionnaires } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { logAudit } from "@/lib/audit"

export async function getQuestionnaireWithQuestions() {
  // Get the published questionnaire
  const [questionnaire] = await db
    .select()
    .from(questionnaires)
    .where(eq(questionnaires.status, "published"))
    .limit(1)

  if (!questionnaire) return null

  const questionList = await db
    .select()
    .from(questions)
    .where(eq(questions.questionnaireId, questionnaire.id))
    .orderBy(asc(questions.sortOrder))

  return { questionnaire, questions: questionList }
}

export async function updateQuestion(
  questionId: string,
  data: {
    text?: string
    scoreWeight?: number
    options?: { label: string; value: string; score: number }[]
    conditionalLogic?: { skipWhen: string[]; skipTargets: string[] } | null
  },
) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (!callerRole || !["admin", "super_admin"].includes(callerRole)) {
    return { success: false as const, error: "Unauthorized" }
  }

  // Compute maxScore from options if options provided
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.text !== undefined) updates.text = data.text
  if (data.options !== undefined) {
    updates.options = data.options
    updates.scoreWeight = Math.max(0, ...data.options.map((o) => o.score))
  }
  if (data.scoreWeight !== undefined && data.options === undefined) {
    updates.scoreWeight = data.scoreWeight
  }
  if (data.conditionalLogic !== undefined) {
    updates.conditionalLogic = data.conditionalLogic
  }

  await db
    .update(questions)
    .set(updates)
    .where(eq(questions.id, questionId))

  logAudit({
    actorId: session?.user?.id,
    action: "update",
    entityType: "question",
    entityId: questionId,
    metadata: { fields: Object.keys(updates).filter((k) => k !== "updatedAt") },
  }).catch(console.error)

  revalidatePath("/admin/questionnaires")
  return { success: true as const }
}
