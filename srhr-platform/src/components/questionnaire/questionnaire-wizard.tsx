"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { QuestionCard } from "./question-card"
import {
  DEMOGRAPHIC_QUESTIONS,
  CLOSING_QUESTIONS,
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

interface QuestionnaireWizardProps {
  submitterType: SubmitterType
  onComplete: (data: QuestionnaireCompleteData) => void
}

type WizardQuestion = {
  id: string
  text: string
  type: "text" | "select" | "radio"
  options?: { label: string; value: string }[]
}

export function QuestionnaireWizard({
  submitterType,
  onComplete,
}: QuestionnaireWizardProps) {
  const [responses, setResponses] = useState<QuestionnaireResponse>({})
  const [currentIndex, setCurrentIndex] = useState(0)

  const sex = (responses["Q3"] as Sex) || null

  // Build the full question list, applying skip logic
  const visibleQuestions = useMemo(() => {
    const allQuestions: WizardQuestion[] = []

    // Q1-Q10: demographics
    for (const q of DEMOGRAPHIC_QUESTIONS) {
      allQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
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

    for (const q of SCORED_QUESTIONS) {
      if (skippedIds.has(q.id)) continue
      if (q.maxScore === 0 && q.options.length === 0) continue // Q23 not scored, no options

      allQuestions.push({
        id: q.id,
        text: `${q.id}: ${q.diseaseGroup.replace("_", " ")} assessment`,
        type: "radio",
        options: q.options.map((o) => ({ label: o.label, value: o.value })),
      })
    }

    // Q44-Q45: closing
    for (const q of CLOSING_QUESTIONS) {
      allQuestions.push({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
      })
    }

    return allQuestions
  }, [sex, responses])

  const totalQuestions = visibleQuestions.length
  const currentQuestion = visibleQuestions[currentIndex]
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0
  const isLast = currentIndex === totalQuestions - 1

  function handleChange(value: string) {
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  function handleNext() {
    if (isLast) {
      handleSubmit()
      return
    }
    setCurrentIndex((i) => Math.min(i + 1, totalQuestions - 1))
  }

  function handleBack() {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }

  const canAdvance = !!responses[visibleQuestions[currentIndex]?.id]

  const handleEnterKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== "Enter") return
      const tag = (e.target as HTMLElement)?.tagName
      // Let text inputs handle Enter via their own onKeyDown
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (canAdvance) handleNext()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canAdvance, currentIndex, isLast, totalQuestions],
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

  if (!currentQuestion) {
    return <p className="text-muted-foreground">Loading questionnaire...</p>
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">
          Question {currentIndex + 1} of {totalQuestions}
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
      />

      <nav className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentIndex === 0}
        >
          Back
        </Button>
        <Button onClick={handleNext}>
          {isLast ? "Submit" : "Next"}
        </Button>
      </nav>
    </section>
  )
}
