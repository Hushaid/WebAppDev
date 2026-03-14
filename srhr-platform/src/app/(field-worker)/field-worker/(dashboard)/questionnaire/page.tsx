"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/client"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"
import { captureGps } from "@/lib/utils/geo"
import { addPendingSubmission } from "@/lib/offline/db"

export default function FieldWorkerQuestionnairePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)

  async function handleComplete(data: QuestionnaireCompleteData) {
    setSubmitting(true)

    if (!session?.user?.id) {
      router.push("/log-in")
      return
    }

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

    const payload = {
      submitterId: session.user.id,
      submitterType: data.submitterType,
      questionnaireVersionId: "v1",
      sex: data.sex,
      responses: data.responses,
      gpsLat,
      gpsLng,
      clientSubmissionId: crypto.randomUUID(),
    }

    // Try online submission first, fall back to offline queue
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const result = await res.json()
        sessionStorage.setItem(
          "lastRiskResult",
          JSON.stringify(data.riskResult),
        )
        sessionStorage.setItem("lastSubmissionId", result.submissionId)
      } else {
        // Server error — queue for later
        await addPendingSubmission(payload)
      }
    } catch {
      // Network error — queue for offline sync
      await addPendingSubmission(payload)
      sessionStorage.setItem(
        "lastRiskResult",
        JSON.stringify(data.riskResult),
      )
    }

    router.push("/field-worker/result")
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Health Assessment</h1>
        <p className="text-muted-foreground">
          {submitting
            ? "Submitting assessment..."
            : "Complete the health risk assessment for the individual you are assisting."}
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
