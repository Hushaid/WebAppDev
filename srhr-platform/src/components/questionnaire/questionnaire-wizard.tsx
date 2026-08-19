"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useMessages, useTranslations, useLocale } from "next-intl"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { QuestionCard } from "./question-card"
import {
  DEMOGRAPHIC_QUESTIONS,
  CLOSING_QUESTIONS,
  POST_SURVEY_QUESTIONS,
  type Sex,
  type SubmitterType,
  type QuestionnaireResponse,
  type QuestionnaireCompleteData,
} from "./types"
import {
  SCORED_QUESTIONS,
  SKIP_RULES,
  MATERNAL_QUESTIONS,
} from "@/lib/scoring/questions-config"
import { computeRisk, type QuestionResponse } from "@/lib/scoring/engine"
import {
  localizeScoredQuestions,
  localizeDemographicQuestions,
} from "@/lib/i18n/questions"

interface QuestionnaireWizardProps {
  submitterType: SubmitterType
  onComplete: (data: QuestionnaireCompleteData) => void
}

/** Question IDs where a response is not required to advance */
const OPTIONAL_QUESTION_IDS = new Set(["Q10", "Q44", "PS4", "PS5"])

type WizardQuestion = {
  id: string
  text: string
  type: "text" | "select" | "radio" | "checkbox"
  options?: { label: string; value: string }[]
  optional?: boolean
}

type DbQuestion = {
  questionNumber: string
  text: string
  type: string
  options?: { label: string; value: string; score: number }[] | null
  sortOrder?: number
  translations?: {
    pcm?: { text: string; options?: Record<string, string> }
    ha?: { text: string; options?: Record<string, string> }
  } | null
}

export function QuestionnaireWizard({
  submitterType,
  onComplete,
}: QuestionnaireWizardProps) {
  const [responses, setResponses] = useState<QuestionnaireResponse>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showError, setShowError] = useState(false)
  // DB question overrides: questionId → { text, options }
  const [dbOverrides, setDbOverrides] = useState<Map<string, DbQuestion>>(new Map())
  // DB question order: questionNumber[] sorted by sortOrder
  const [dbOrder, setDbOrder] = useState<string[]>([])
  const locale = useLocale()
  const messages = useMessages() as unknown as Parameters<
    typeof localizeDemographicQuestions
  >[1]
  const t = useTranslations("questionnaire")
  const tCommon = useTranslations("common")

  // Fetch current question text/options/order from DB so admin edits reflect immediately
  useEffect(() => {
    fetch("/api/questionnaire/questions")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: DbQuestion[]) => {
        const map = new Map<string, DbQuestion>()
        const order: string[] = []
        for (const row of rows) {
          map.set(row.questionNumber, row)
          order.push(row.questionNumber)
        }
        setDbOverrides(map)
        setDbOrder(order)
      })
      .catch(() => {/* fallback to static config on network error */})
  }, [])

  const sex = (responses["Q3"] as Sex) || null

  // Apply i18n first, then DB overrides on top so admin edits always win over translations
  const localizedDemographic = useMemo(() => {
    const i18n = messages ? localizeDemographicQuestions(DEMOGRAPHIC_QUESTIONS, messages) : DEMOGRAPHIC_QUESTIONS
    return i18n.map((q) => {
      const db = dbOverrides.get(q.id)
      if (!db) return q
      const tr = locale !== "en" ? db.translations?.[locale as "pcm" | "ha"] : null
      // No DB translation for this locale — keep the i18n-localized text instead of
      // falling back to the DB's plain English column, which only reflects admin edits.
      if (locale !== "en" && !tr) return q
      return {
        ...q,
        text: tr?.text ?? db.text,
        options: db.options?.length
          ? db.options.map((o) => ({ label: tr?.options?.[o.value] ?? o.label, value: o.value }))
          : q.options,
      }
    })
  }, [messages, dbOverrides, locale])

  const localizedScored = useMemo(() => {
    const i18n = messages ? localizeScoredQuestions(SCORED_QUESTIONS, messages) : SCORED_QUESTIONS
    return i18n.map((q) => {
      const db = dbOverrides.get(q.id)
      if (!db) return q
      const tr = locale !== "en" ? db.translations?.[locale as "pcm" | "ha"] : null
      if (locale !== "en" && !tr) return q
      return {
        ...q,
        text: tr?.text ?? db.text,
        options: db.options?.length
          ? q.options.map((staticOpt) => {
              const dbOpt = db.options!.find((o) => o.value === staticOpt.value)
              if (!dbOpt) return staticOpt
              return { ...staticOpt, label: tr?.options?.[dbOpt.value] ?? dbOpt.label }
            })
          : q.options,
      }
    })
  }, [messages, dbOverrides, locale])

  const localizedClosing = useMemo(() => {
    const i18n = messages ? localizeDemographicQuestions(CLOSING_QUESTIONS, messages) : CLOSING_QUESTIONS
    return i18n.map((q) => {
      const db = dbOverrides.get(q.id)
      if (!db) return q
      const tr = locale !== "en" ? db.translations?.[locale as "pcm" | "ha"] : null
      if (locale !== "en" && !tr) return q
      return {
        ...q,
        text: tr?.text ?? db.text,
        options: db.options?.length
          ? db.options.map((o) => ({ label: tr?.options?.[o.value] ?? o.label, value: o.value }))
          : q.options,
      }
    })
  }, [messages, dbOverrides, locale])

  const localizedPostSurvey = useMemo(() => {
    const i18n = messages ? localizeDemographicQuestions(POST_SURVEY_QUESTIONS, messages) : POST_SURVEY_QUESTIONS
    return i18n.map((q) => {
      const db = dbOverrides.get(q.id)
      if (!db) return q
      const tr = locale !== "en" ? db.translations?.[locale as "pcm" | "ha"] : null
      if (locale !== "en" && !tr) return q
      return {
        ...q,
        text: tr?.text ?? db.text,
        options: db.options?.length
          ? db.options.map((o) => ({ label: tr?.options?.[o.value] ?? o.label, value: o.value }))
          : q.options,
      }
    })
  }, [messages, dbOverrides, locale])

  // Build the full question list, applying skip logic
  const visibleQuestions = useMemo(() => {
    const allQuestions: WizardQuestion[] = []

    // Q1-Q10: demographics
    for (const q of localizedDemographic) {
      allQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        optional: OPTIONAL_QUESTION_IDS.has(q.id),
      })
    }

    // Q11-Q43: scored questions
    const skippedIds = new Set<string>()

    // Gender-based skip
    if (sex === "male") {
      for (const qId of MATERNAL_QUESTIONS) {
        skippedIds.add(qId)
      }
    }

    // Conditional skip rules
    for (const rule of SKIP_RULES) {
      const val = responses[rule.questionId]
      if (val && rule.skipWhen.includes(val)) {
        for (const target of rule.skipTargets) {
          skippedIds.add(target)
        }
      }
    }

    for (const q of localizedScored) {
      if (skippedIds.has(q.id)) continue
      if (q.maxScore === 0 && q.options.length === 0) continue // Q23 not scored, no options

      allQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type ?? "radio",
        options: q.options.map((o) => ({ label: o.label, value: o.value })),
      })
    }

    // Q44-Q45: closing
    for (const q of localizedClosing) {
      allQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        optional: OPTIONAL_QUESTION_IDS.has(q.id),
      })
    }

    // PS1-PS5: post-survey feedback
    for (const q of localizedPostSurvey) {
      allQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        optional: OPTIONAL_QUESTION_IDS.has(q.id),
      })
    }

    // Inject questions that exist only in the DB (created via admin) and are not
    // in any static config list, so they appear in the wizard at the right position.
    if (dbOrder.length > 0) {
      const allIds = new Set(allQuestions.map((q) => q.id))
      for (const qId of dbOrder) {
        if (!allIds.has(qId) && !skippedIds.has(qId)) {
          const db = dbOverrides.get(qId)
          if (db) {
            const wizType: WizardQuestion["type"] =
              db.type === "multiple_choice" ? "checkbox" :
              db.type === "text" ? "text" : "radio"
            const tr = locale !== "en" ? db.translations?.[locale as "pcm" | "ha"] : null
            allQuestions.push({
              id: qId,
              text: tr?.text ?? db.text,
              type: wizType,
              options: db.options?.length
                ? db.options.map((o) => ({ label: tr?.options?.[o.value] ?? o.label, value: o.value }))
                : undefined,
              optional: OPTIONAL_QUESTION_IDS.has(qId),
            })
          }
        }
      }
    }

    // Re-order by DB sortOrder when available so admin position changes reflect live
    if (dbOrder.length > 0) {
      const orderMap = new Map(dbOrder.map((id, i) => [id, i]))
      allQuestions.sort((a, b) => {
        const ai = orderMap.get(a.id) ?? 99999
        const bi = orderMap.get(b.id) ?? 99999
        return ai - bi
      })
    }

    return allQuestions
  }, [sex, responses, localizedDemographic, localizedScored, localizedClosing, localizedPostSurvey, dbOrder, dbOverrides, locale])

  const totalQuestions = visibleQuestions.length
  // Clamp index if the list shrank due to skip logic changes
  const safeIndex = Math.min(currentIndex, totalQuestions - 1)
  const currentQuestion = visibleQuestions[safeIndex]
  const progress = totalQuestions > 0 ? ((safeIndex + 1) / totalQuestions) * 100 : 0
  const isLast = safeIndex === totalQuestions - 1

  function handleChange(value: string) {
    setShowError(false)
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  function handleNext() {
    if (!canAdvance) {
      setShowError(true)
      return
    }
    setShowError(false)
    if (isLast) {
      handleSubmit()
      return
    }
    setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1))
  }

  function handleBack() {
    setShowError(false)
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }

  const canAdvance =
    currentQuestion?.optional || !!responses[visibleQuestions[safeIndex]?.id]

  const handleEnterKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Enter") return
      const tag = (e.target as HTMLElement)?.tagName
      // Let text inputs handle Enter via their own onKeyDown
      if (tag === "INPUT" || tag === "TEXTAREA") return
      handleNext()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canAdvance, safeIndex, isLast, totalQuestions],
  )

  useEffect(() => {
    window.addEventListener("keydown", handleEnterKey)
    return () => window.removeEventListener("keydown", handleEnterKey)
  }, [handleEnterKey])

  function handleSubmit() {
    if (!sex) return

    const scoredResponses: QuestionResponse[] = SCORED_QUESTIONS.filter(
      (q) => responses[q.id],
    ).map((q) => ({
      questionId: q.id,
      value: responses[q.id],
    }))

    const riskResult = computeRisk(scoredResponses, sex)

    onComplete({
      responses,
      riskResult,
      sex,
      submitterType,
    })
  }

  // Consent declined — stop the survey
  const consentDeclined = responses["Q1"] === "no"

  if (!currentQuestion) {
    return <p className="text-muted-foreground">{tCommon("loading")}</p>
  }

  if (consentDeclined && safeIndex > 0) {
    return (
      <section className="space-y-6">
        <div className="rounded-lg border p-6 text-center space-y-4">
          <h3 className="text-lg font-semibold">{t("surveyEndedTitle")}</h3>
          <p className="text-muted-foreground">
            {t("surveyEndedMessage")}
          </p>
          <Button variant="outline" onClick={() => {
            setResponses({})
            setCurrentIndex(0)
          }}>
            {t("startOver")}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">
          {t("progress", {
            current: safeIndex + 1,
            total: totalQuestions,
          })}
        </p>
      </header>

      <QuestionCard
        key={currentQuestion.id}
        questionId={currentQuestion.id}
        text={currentQuestion.text}
        type={currentQuestion.type}
        options={currentQuestion.options}
        value={responses[currentQuestion.id] ?? ""}
        onChange={handleChange}
        onNext={handleNext}
        showError={showError}
        optional={currentQuestion.optional}
      />

      <nav className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={safeIndex === 0}
        >
          {tCommon("back")}
        </Button>
        <Button onClick={handleNext}>
          {isLast ? tCommon("submit") : tCommon("next")}
        </Button>
      </nav>
    </section>
  )
}
