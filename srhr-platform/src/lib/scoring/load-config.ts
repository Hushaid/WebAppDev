import { db } from "@/lib/db"
import { questions, questionnaires } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import type { ScoringConfig } from "./engine"
import { SCORED_QUESTIONS, type QuestionConfig, type DiseaseGroup } from "./questions-config"

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

  // Build a lookup from static config to inherit type/checkboxScoring metadata.
  // The DB type column is unreliable (seed stored everything as single_choice),
  // so we derive checkbox behaviour from the static config instead.
  const staticMap = new Map(SCORED_QUESTIONS.map((q) => [q.id, q]))

  const questionConfigs: QuestionConfig[] = scoredRows.map((r) => {
    const staticQ = staticMap.get(r.questionNumber)
    const isCheckbox = staticQ?.type === "checkbox"
    return {
      id: r.questionNumber,
      text: r.text,
      diseaseGroup: r.diseaseGroup as DiseaseGroup,
      maxScore: r.scoreWeight,
      options: (r.options ?? []) as { label: string; value: string; score: number }[],
      ...(isCheckbox && {
        type: "checkbox" as const,
        checkboxScoring: staticQ?.checkboxScoring,
      }),
    }
  })

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
