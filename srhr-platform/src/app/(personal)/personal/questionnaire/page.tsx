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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function PersonalQuestionnairePage() {
  const t = useTranslations("questionnaire")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState<{
    blocked: boolean
    cooldownEndsAt?: string
  }>({ blocked: false })
  const [checking, setChecking] = useState(true)
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null)

  // Request location permission immediately on page load so the browser
  // prompt is visible while the user reads the first question.
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

  // Check single-submission cooldown (24h)
  useEffect(() => {
    async function checkCooldown() {
      try {
        const submitterId = session?.user?.id ?? ""
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
  }, [session?.user?.id])

  async function handleComplete(data: QuestionnaireCompleteData) {
    setSubmitting(true)

    // Use GPS captured at page load (prompt was shown on mount)
    const gpsLat = gpsRef.current?.lat.toString()
    const gpsLng = gpsRef.current?.lng.toString()

    if (!session?.user?.id) {
      router.push("/log-in")
      return
    }

    // Always store the client-computed risk result so the result page works
    // even if the API fails or is slow
    sessionStorage.setItem(
      "lastRiskResult",
      JSON.stringify(data.riskResult),
    )

    // Submit to API
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterId: session.user.id,
          submitterType: data.submitterType,
          questionnaireVersionId: "v1",
          sex: data.sex,
          responses: data.responses,
          gpsLat,
          gpsLng,
        }),
      })

      if (res.ok) {
        const result = await res.json()
        sessionStorage.setItem("lastSubmissionId", result.submissionId)
      } else {
        // API error — queue for offline retry so data is not lost
        await addPendingSubmission({
          submitterId: session.user.id,
          submitterType: data.submitterType,
          questionnaireVersionId: "v1",
          sex: data.sex,
          responses: data.responses,
          gpsLat,
          gpsLng,
        })
      }
    } catch {
      await addPendingSubmission({
        submitterId: session.user.id,
        submitterType: data.submitterType,
        questionnaireVersionId: "v1",
        sex: data.sex,
        responses: data.responses,
        gpsLat,
        gpsLng,
      })
    }

    router.push("/personal/result")
  }

  if (checking) {
    return (
      <section className="mx-auto max-w-md space-y-6">
        <header>
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
          <p className="text-muted-foreground">{t("checkingAvailability")}</p>
        </header>
      </section>
    )
  }

  if (cooldown.blocked) {
    const endsAt = cooldown.cooldownEndsAt
      ? new Date(cooldown.cooldownEndsAt)
      : null

    return (
      <section className="mx-auto max-w-md space-y-6">
        <header>
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>{t("cooldownTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              {t("cooldownBody")}
            </p>
            {endsAt && (
              <p className="text-sm">
                {t("cooldownAfter").replace("{time}", endsAt.toLocaleString())}
              </p>
            )}
            <Link href="/personal/result">
              <Button variant="outline">{t("viewLastResults")}</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("pageTitle")}</h1>
          <Link href="/personal">
            <Button variant="ghost" size="sm">
              {tCommon("close")}
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground">
          {submitting
            ? t("submittingAnswers")
            : t("pageDescription")}
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
