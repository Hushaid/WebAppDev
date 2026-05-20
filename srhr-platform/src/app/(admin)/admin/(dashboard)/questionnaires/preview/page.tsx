"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import {
  DEMOGRAPHIC_QUESTIONS,
  CLOSING_QUESTIONS,
  POST_SURVEY_QUESTIONS,
  type DemographicQuestion,
} from "@/components/questionnaire/types"
import { SCORED_QUESTIONS } from "@/lib/scoring/questions-config"
import { ChevronLeft, ChevronRight, Eye } from "lucide-react"

type PreviewSex = "male" | "female"

export default function QuestionnairePreviewPage() {
  const [sex, setSex] = useState<PreviewSex>("female")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})

  // Build question list same as wizard
  const maternalIds = SCORED_QUESTIONS
    .filter((q) => q.diseaseGroup === "maternal_health")
    .map((q) => q.id)

  const allQuestions: DemographicQuestion[] = [
    ...DEMOGRAPHIC_QUESTIONS,
    ...SCORED_QUESTIONS.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.options.length > 0 ? ("radio" as const) : ("text" as const),
      options: q.options.map((o) => ({ label: o.label, value: o.value })),
    })),
    ...CLOSING_QUESTIONS,
    ...POST_SURVEY_QUESTIONS,
  ]

  // Filter based on sex
  const visibleQuestions = allQuestions.filter((q) => {
    if (sex === "male" && maternalIds.includes(q.id)) return false
    return true
  })

  const question = visibleQuestions[currentIndex]
  const total = visibleQuestions.length

  if (!question) return null

  const scoredConfig = SCORED_QUESTIONS.find((q) => q.id === question.id)
  const diseaseGroup = scoredConfig?.diseaseGroup
  const maxScore = scoredConfig?.maxScore

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6" />
            Questionnaire Preview
          </h1>
          <p className="text-muted-foreground">
            Preview the questionnaire as a field worker or personal user would see it.
            Responses are not saved.
          </p>
        </hgroup>
        <Link href="/admin/questionnaires">
          <Button variant="outline">Back</Button>
        </Link>
      </header>

      <div className="flex items-center gap-3">
        <Label>Preview as:</Label>
        <div className="flex gap-2">
          <Button
            variant={sex === "female" ? "default" : "outline"}
            size="sm"
            onClick={() => { setSex("female"); setCurrentIndex(0) }}
          >
            Female
          </Button>
          <Button
            variant={sex === "male" ? "default" : "outline"}
            size="sm"
            onClick={() => { setSex("male"); setCurrentIndex(0) }}
          >
            Male
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          ({total} questions)
        </span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {question.id}. {question.text}
            </CardTitle>
            <div className="flex items-center gap-2">
              {diseaseGroup && (
                <Badge variant="outline">{diseaseGroup.replace("_", " ")}</Badge>
              )}
              {maxScore !== undefined && maxScore > 0 && (
                <Badge variant="secondary">max: {maxScore}</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {total}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.type === "radio" && question.options ? (
            <RadioGroup
              value={responses[question.id] ?? ""}
              onValueChange={(v) =>
                setResponses((prev) => ({ ...prev, [question.id]: v }))
              }
            >
              {question.options.map((opt) => {
                const optScore = scoredConfig?.options.find(
                  (o) => o.value === opt.value,
                )?.score
                return (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
                    <Label htmlFor={`${question.id}-${opt.value}`} className="flex-1">
                      {opt.label}
                      {optScore !== undefined && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (+{optScore})
                        </span>
                      )}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          ) : (
            <Input
              placeholder="Text input"
              value={responses[question.id] ?? ""}
              onChange={(e) =>
                setResponses((prev) => ({ ...prev, [question.id]: e.target.value }))
              }
            />
          )}
        </CardContent>
      </Card>

      <nav className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {total}
        </span>
        <Button
          onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
          disabled={currentIndex === total - 1}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </nav>
    </section>
  )
}
