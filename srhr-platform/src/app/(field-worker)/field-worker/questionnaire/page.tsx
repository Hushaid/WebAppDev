"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"
import { captureGps } from "@/lib/utils/geo"

export default function FieldWorkerQuestionnairePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleComplete(data: QuestionnaireCompleteData) {
    setSubmitting(true)

    // Capture GPS
    let gpsLat: string | undefined
    let gpsLng: string | undefined
    try {
      const gps = await captureGps()
      gpsLat = gps.lat.toString()
      gpsLng = gps.lng.toString()
      sessionStorage.setItem("lastGps", JSON.stringify(gps))
    } catch {
      // GPS optional — continue without it
    }

    // Submit to API
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterId: crypto.randomUUID(), // TODO: use actual user ID from session
          submitterType: data.submitterType,
          questionnaireVersionId: crypto.randomUUID(), // TODO: use actual questionnaire version
          sex: data.sex,
          responses: data.responses,
          gpsLat,
          gpsLng,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        sessionStorage.setItem(
          "lastRiskResult",
          JSON.stringify(data.riskResult),
        )
        sessionStorage.setItem(
          "lastSubmissionId",
          result.submissionId,
        )
      }
    } catch {
      // TODO: queue for offline sync
    }

    router.push("/field-worker/history")
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Health Assessment</h1>
        <p className="text-muted-foreground">
          {submitting
            ? "Submitting assessment..."
            : "Complete the SRHR risk assessment questionnaire."}
        </p>
      </header>
      {!submitting && (
        <QuestionnaireWizard
          submitterType="field_worker"
          onComplete={handleComplete}
        />
      )}
    </section>
  )
}
