"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"
import { captureGps } from "@/lib/utils/geo"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function PersonalQuestionnairePage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState<{
    blocked: boolean
    cooldownEndsAt?: string
  }>({ blocked: false })
  const [checking, setChecking] = useState(true)

  // Check single-submission cooldown (24h)
  useEffect(() => {
    async function checkCooldown() {
      try {
        // TODO: replace with actual user ID from session
        const submitterId = sessionStorage.getItem("userId") ?? ""
        if (!submitterId) {
          setChecking(false)
          return
        }

        const res = await fetch(
          `/api/submissions/check?submitterId=${submitterId}&cooldownHours=24`,
        )
        if (res.ok) {
          const data = await res.json()
          if (!data.canSubmit) {
            setCooldown({
              blocked: true,
              cooldownEndsAt: data.cooldownEndsAt,
            })
          }
        }
      } catch {
        // Network error — allow submission (offline scenario)
      } finally {
        setChecking(false)
      }
    }
    checkCooldown()
  }, [])

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
      // GPS optional
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
        sessionStorage.setItem("lastSubmissionId", result.submissionId)
      }
    } catch {
      // TODO: queue for offline sync
    }

    router.push("/personal/result")
  }

  if (checking) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Self Assessment</h1>
          <p className="text-muted-foreground">Checking availability...</p>
        </header>
      </section>
    )
  }

  if (cooldown.blocked) {
    const endsAt = cooldown.cooldownEndsAt
      ? new Date(cooldown.cooldownEndsAt)
      : null

    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Self Assessment</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Assessment Cooldown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              You have already completed an assessment recently. To ensure
              accurate results, please wait before taking another one.
            </p>
            {endsAt && (
              <p className="text-sm">
                You can take another assessment after{" "}
                <time dateTime={endsAt.toISOString()} className="font-medium">
                  {endsAt.toLocaleString()}
                </time>
              </p>
            )}
            <Link href="/personal/result">
              <Button variant="outline">View Your Last Results</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Self Assessment</h1>
        <p className="text-muted-foreground">
          {submitting
            ? "Submitting assessment..."
            : "Complete the SRHR risk assessment questionnaire."}
        </p>
      </header>
      {!submitting && (
        <QuestionnaireWizard
          submitterType="personal_user"
          onComplete={handleComplete}
        />
      )}
    </section>
  )
}
