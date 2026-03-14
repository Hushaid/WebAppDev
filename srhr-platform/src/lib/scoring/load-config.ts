import { db } from "@/lib/db"
import { questions, questionnaires } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import type { ScoringConfig } from "./engine"
import type { QuestionConfig, DiseaseGroup } from "./questions-config"

/**
 * Loads scoring configuration from the database.
 * Returns null if no published questionnaire exists or if questions lack options data.
 */
export async function loadScoringConfigFromDB(): Promise<ScoringConfig | null> {
  const [questionnaire] = await db
    .select({ id: questionnaires.id })
    .from(questionnaires)
    .where(eq(questionnaires.status, "published"))
    .limit(1)

  if (!questionnaire) return null

  const rows = await db
    .select()
    .from(questions)
    .where(eq(questions.questionnaireId, questionnaire.id))
    .orderBy(asc(questions.sortOrder))

  const scoredRows = rows.filter((r) => r.diseaseGroup !== null && r.options)
  if (scoredRows.length === 0) return null

  const questionConfigs: QuestionConfig[] = scoredRows.map((r) => ({
    id: r.questionNumber,
    text: r.text,
    diseaseGroup: r.diseaseGroup as DiseaseGroup,
    maxScore: r.scoreWeight,
    options: (r.options ?? []) as { label: string; value: string; score: number }[],
  }))

  const skipRules = scoredRows
    .filter((r) => {
      const logic = r.conditionalLogic as { skipWhen?: string[]; skipTargets?: string[] } | null
      return logic?.skipWhen && logic?.skipTargets
    })
    .map((r) => {
      const logic = r.conditionalLogic as { skipWhen: string[]; skipTargets: string[] }
      return {
        questionId: r.questionNumber,
        skipWhen: logic.skipWhen,
        skipTargets: logic.skipTargets,
      }
    })

  const maternalQuestionIds = scoredRows
    .filter((r) => r.diseaseGroup === "maternal_health")
    .map((r) => r.questionNumber)

  return { questions: questionConfigs, skipRules, maternalQuestionIds }
}
