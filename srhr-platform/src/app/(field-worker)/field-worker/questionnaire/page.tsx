"use client"

import { useRouter } from "next/navigation"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"

export default function FieldWorkerQuestionnairePage() {
  const router = useRouter()

  function handleComplete(data: QuestionnaireCompleteData) {
    // TODO: submit to server action, then redirect to results
    console.log("Field worker submission:", data)
    router.push("/field-worker/history")
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Health Assessment</h1>
        <p className="text-muted-foreground">
          Complete the SRHR risk assessment questionnaire.
        </p>
      </header>
      <QuestionnaireWizard
        submitterType="field_worker"
        onComplete={handleComplete}
      />
    </section>
  )
}
