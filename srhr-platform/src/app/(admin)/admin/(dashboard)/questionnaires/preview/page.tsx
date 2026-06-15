import Link from "next/link"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getQuestionnaireWithQuestions } from "../actions"
import { QuestionnairePreviewClient, type PreviewQuestion } from "./preview-client"

export const dynamic = "force-dynamic"

export default async function QuestionnairePreviewPage() {
  const result = await getQuestionnaireWithQuestions()

  if (!result) {
    return (
      <section className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <hgroup>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6" />
              Questionnaire Preview
            </h1>
          </hgroup>
          <Link href="/admin/questionnaires">
            <Button variant="outline">Back</Button>
          </Link>
        </header>
        <p className="text-muted-foreground">No published questionnaire found.</p>
      </section>
    )
  }

  const questions: PreviewQuestion[] = result.questions.map((q) => ({
    id: q.questionNumber,
    text: q.text,
    inputType: ["single_choice", "yes_no", "multiple_choice"].includes(q.type) ? "radio" : "text",
    diseaseGroup: q.diseaseGroup ?? null,
    maxScore: q.scoreWeight ?? 0,
    options: (q.options ?? []).map((o) => ({
      label: o.label,
      value: o.value,
      score: o.score,
    })),
  }))

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

      <QuestionnairePreviewClient questions={questions} />
    </section>
  )
}
