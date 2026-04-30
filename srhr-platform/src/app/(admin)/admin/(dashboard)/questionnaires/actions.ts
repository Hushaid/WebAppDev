"use server"

import { db } from "@/lib/db"
import { questions, questionnaires } from "@/lib/db/schema"
import { eq, asc, sql } from "drizzle-orm"
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

export async function createQuestion(data: {
  questionNumber: string
  text: string
  type: "single_choice" | "multiple_choice" | "numeric" | "yes_no" | "text"
  diseaseGroup?: "sti" | "maternal_health" | "community_wellbeing" | null
  options?: { label: string; value: string; score: number }[]
}) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (!callerRole || !["admin", "super_admin"].includes(callerRole)) {
    return { success: false as const, error: "Unauthorized" }
  }

  const [questionnaire] = await db
    .select({ id: questionnaires.id })
    .from(questionnaires)
    .where(eq(questionnaires.status, "published"))
    .limit(1)

  if (!questionnaire) return { success: false as const, error: "No published questionnaire found" }

  // Place new question at the end
  const [{ maxSort }] = await db
    .select({ maxSort: sql<number>`coalesce(max(sort_order), 0)` })
    .from(questions)
    .where(eq(questions.questionnaireId, questionnaire.id))

  await db.insert(questions).values({
    questionnaireId: questionnaire.id,
    questionNumber: data.questionNumber.trim(),
    text: data.text.trim(),
    type: data.type,
    diseaseGroup: data.diseaseGroup ?? null,
    options: data.options ?? [],
    scoreWeight: data.options ? Math.max(0, ...data.options.map((o) => o.score)) : 0,
    conditionalLogic: null,
    sortOrder: maxSort + 10,
  })

  logAudit({
    actorId: session?.user?.id,
    action: "create",
    entityType: "question",
    entityId: data.questionNumber,
  }).catch(console.error)

  revalidatePath("/admin/questionnaires")
  return { success: true as const }
}

export async function deleteQuestion(questionId: string) {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (!callerRole || !["super_admin"].includes(callerRole)) {
    return { success: false as const, error: "Only super admins can delete questions" }
  }

  await db.delete(questions).where(eq(questions.id, questionId))

  logAudit({
    actorId: session?.user?.id,
    action: "delete",
    entityType: "question",
    entityId: questionId,
  }).catch(console.error)

  revalidatePath("/admin/questionnaires")
  return { success: true as const }
}
