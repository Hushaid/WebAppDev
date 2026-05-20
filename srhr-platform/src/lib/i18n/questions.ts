import type { QuestionConfig } from "@/lib/scoring/questions-config"
import type { DemographicQuestion } from "@/components/questionnaire/types"

type Messages = Record<string, Record<string, Record<string, string> | string>>

/**
 * Overlay translated text onto scored question configs.
 * Falls back to English text already embedded in the config if a translation is missing.
 */
export function localizeScoredQuestions(
  questions: QuestionConfig[],
  messages: Messages,
): QuestionConfig[] {
  const qs = messages.questions as Record<string, Record<string, unknown>> | undefined
  if (!qs) return questions

  return questions.map((q) => {
    const t = qs[q.id] as { text?: string; options?: Record<string, string> } | undefined
    if (!t) return q

    return {
      ...q,
      text: t.text ?? q.text,
      options: q.options.map((opt) => ({
        ...opt,
        label: t.options?.[opt.value] ?? opt.label,
      })),
    }
  })
}

/**
 * Overlay translated text onto demographic / closing / post-survey questions.
 * Falls back to English text already embedded in the config if a translation is missing.
 */
export function localizeDemographicQuestions(
  questions: DemographicQuestion[],
  messages: Messages,
): DemographicQuestion[] {
  const qs = messages.questions as Record<string, Record<string, unknown>> | undefined
  if (!qs) return questions

  return questions.map((q) => {
    const t = qs[q.id] as { text?: string; options?: Record<string, string> } | undefined
    if (!t) return q

    return {
      ...q,
      text: t.text ?? q.text,
      options: q.options?.map((opt) => ({
        ...opt,
        label: t.options?.[opt.value] ?? opt.label,
      })),
    }
  })
}
