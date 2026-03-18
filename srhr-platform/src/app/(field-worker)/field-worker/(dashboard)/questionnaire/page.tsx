"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth/client"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"
import { captureGps } from "@/lib/utils/geo"
import { addPendingSubmission } from "@/lib/offline/db"
import { Button } from "@/components/ui/button"

export default function FieldWorkerQuestionnairePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null)

  // Request location permission immediately on page load so the browser
  // prompt is visible while the field worker reads the first question.
  useEffect(() => {
    captureGps()
      .then((gps) => {
        gpsRef.current = gps
        sessionStorage.setItem("lastGps", JSON.stringify(gps))
      })
      .catch(() => {
        // GPS is optional — continue without it
      })
  }, [])

  async function handleComplete(data: QuestionnaireCompleteData) {
    setSubmitting(true)

    if (!session?.user?.id) {
      router.push("/log-in")
      return
    }

    // Use GPS captured at page load (prompt was shown on mount)
    const gpsLat = gpsRef.current?.lat.toString()
    const gpsLng = gpsRef.current?.lng.toString()

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

    // Always store the client-computed risk result so the result page works
    sessionStorage.setItem(
      "lastRiskResult",
      JSON.stringify(data.riskResult),
    )

    // Try online submission first, fall back to offline queue
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const result = await res.json()
        sessionStorage.setItem("lastSubmissionId", result.submissionId)
      } else {
        // Server error — queue for later
        await addPendingSubmission(payload)
      }
    } catch {
      // Network error — queue for offline sync
      await addPendingSubmission(payload)
    }

    router.push("/field-worker/result")
  }

  return (
    <section className="mx-auto max-w-lg space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Health Assessment</h1>
          <Link href="/field-worker">
            <Button variant="ghost" size="sm">
              Close
            </Button>
          </Link>
        </div>
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
