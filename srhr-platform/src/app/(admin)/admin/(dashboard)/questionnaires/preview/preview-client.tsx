"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"

type PreviewSex = "male" | "female"

export type PreviewQuestion = {
  id: string
  text: string
  inputType: "radio" | "text"
  diseaseGroup: string | null
  maxScore: number
  options: { label: string; value: string; score: number }[]
}

export function QuestionnairePreviewClient({ questions }: { questions: PreviewQuestion[] }) {
  const [sex, setSex] = useState<PreviewSex>("female")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, string>>({})

  const maternalIds = questions
    .filter((q) => q.diseaseGroup === "maternal_health")
    .map((q) => q.id)

  const visibleQuestions = questions.filter((q) => {
    if (sex === "male" && maternalIds.includes(q.id)) return false
    return true
  })

  const question = visibleQuestions[currentIndex]
  const total = visibleQuestions.length

  if (!question) return null

  return (
    <>
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
        <span className="text-sm text-muted-foreground">({total} questions)</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {question.id}. {question.text}
            </CardTitle>
            <div className="flex items-center gap-2">
              {question.diseaseGroup && (
                <Badge variant="outline">{question.diseaseGroup.replace("_", " ")}</Badge>
              )}
              {question.maxScore > 0 && (
                <Badge variant="secondary">max: {question.maxScore}</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {total}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {question.inputType === "radio" && question.options.length > 0 ? (
            <RadioGroup
              value={responses[question.id] ?? ""}
              onValueChange={(v) => setResponses((prev) => ({ ...prev, [question.id]: v }))}
            >
              {question.options.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value} id={`${question.id}-${opt.value}`} />
                  <Label htmlFor={`${question.id}-${opt.value}`} className="flex-1">
                    {opt.label}
                    {opt.score > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">(+{opt.score})</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Input
              placeholder="Text input"
              value={responses[question.id] ?? ""}
              onChange={(e) => setResponses((prev) => ({ ...prev, [question.id]: e.target.value }))}
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
        <span className="text-sm text-muted-foreground">{currentIndex + 1} / {total}</span>
        <Button
          onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
          disabled={currentIndex === total - 1}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </nav>
    </>
  )
}
