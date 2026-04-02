"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth/client"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"
import { captureGps } from "@/lib/utils/geo"
import { addPendingSubmission } from "@/lib/offline/db"
import { Button } from "@/components/ui/button"

type GpsState =
  | { status: "pending" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied"; error: string }
  | { status: "duplicate"; blockedUntil: string; windowMinutes: number }

export default function FieldWorkerQuestionnairePage() {
  const t = useTranslations("fieldWorker")
  const tQuestionnaire = useTranslations("questionnaire")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [gps, setGps] = useState<GpsState>({ status: "pending" })
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null)

  // Request location permission immediately on page load.
  // GPS is required for field workers — it enables duplicate detection (FR-023).
  useEffect(() => {
    if (!session) return // wait for session to load before dedup check

    captureGps()
      .then(async (pos) => {
        gpsRef.current = { lat: pos.lat, lng: pos.lng }
        sessionStorage.setItem("lastGps", JSON.stringify({ lat: pos.lat, lng: pos.lng }))

        // Check for duplicate submission before allowing the assessment to start
        const submitterId = session.user?.id
        if (submitterId) {
          try {
            const res = await fetch(
              `/api/submissions/dedup-check?submitterId=${submitterId}&lat=${pos.lat}&lng=${pos.lng}`,
            )
            if (res.ok) {
              const data = await res.json()
              if (data.isDuplicate) {
                setGps({ status: "duplicate", blockedUntil: data.blockedUntil, windowMinutes: data.windowMinutes })
                return
              }
            }
          } catch {
            // Network error — allow through, API-level check is the final guard
          }
        }

        setGps({ status: "granted", lat: pos.lat, lng: pos.lng })
      })
      .catch((err: Error) => {
        setGps({ status: "denied", error: err.message })
      })
  }, [session])

  async function handleComplete(data: QuestionnaireCompleteData) {
    if (!gpsRef.current) return // blocked by UI — should not reach here

    setSubmitting(true)

    if (!session?.user?.id) {
      router.push("/log-in")
      return
    }

    const gpsLat = gpsRef.current.lat.toString()
    const gpsLng = gpsRef.current.lng.toString()

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
      } else if (res.status === 409) {
        // Duplicate submission detected
        const body = await res.json()
        alert(body.error ?? t("duplicateAlert"))
        setSubmitting(false)
        return
      } else {
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
          <h1 className="text-2xl font-bold">{tQuestionnaire("pageTitle")}</h1>
          <Link href="/field-worker">
            <Button variant="ghost" size="sm">
              {tCommon("close")}
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground">
          {submitting
            ? tQuestionnaire("submitting")
            : t("questionnaireDescription")}
        </p>
      </header>

      {/* GPS required gate */}
      {gps.status === "pending" && (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          {t("waitingForLocationAccess")}
        </div>
      )}

      {gps.status === "denied" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">{t("locationRequiredTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("locationRequiredBody")}
          </p>
          <p className="text-xs text-muted-foreground">Error: {gps.error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t("reloadPage")}
          </Button>
        </div>
      )}

      {gps.status === "duplicate" && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
          <p className="text-sm font-medium text-orange-800">{t("recentSubmissionDetectedTitle")}</p>
          <p className="text-sm text-orange-700">
            {t("recentSubmissionDetectedBody", {
              minutes: gps.windowMinutes,
              unit: gps.windowMinutes === 1 ? t("minute") : t("minutes"),
            })}
          </p>
          <p className="text-sm text-orange-700">
            {t("startNewAssessmentAfter", {
              time: new Date(gps.blockedUntil).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              move: t("moveDifferentLocation"),
            })}
          </p>
        </div>
      )}

      {!submitting && gps.status === "granted" && (
        <QuestionnaireWizard
          submitterType="field_worker"
          onComplete={handleComplete}
        />
      )}
    </section>
  )
}
