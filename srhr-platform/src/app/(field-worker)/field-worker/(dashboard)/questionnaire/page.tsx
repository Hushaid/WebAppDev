"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth/client"
import { QuestionnaireWizard } from "@/components/questionnaire/questionnaire-wizard"
import type { QuestionnaireCompleteData } from "@/components/questionnaire/types"
import { captureGps } from "@/lib/utils/geo"
import { addPendingSubmission } from "@/lib/offline/db"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

type GpsState =
  | { status: "idle" }
  | { status: "requesting" }
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
  const [gps, setGps] = useState<GpsState>({ status: "idle" })
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null)

  const requestGps = useCallback(async () => {
    if (!session) return
    setGps({ status: "requesting" })
    try {
      const pos = await captureGps()
      gpsRef.current = { lat: pos.lat, lng: pos.lng }
      sessionStorage.setItem("lastGps", JSON.stringify({ lat: pos.lat, lng: pos.lng }))

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get location."
      setGps({ status: "denied", error: message })
    }
  }, [session])

  // On mount, check if permission was already granted — if so, auto-request
  // without a button click to avoid unnecessary friction.
  // If permission is "prompt" or unknown, require a user gesture so the browser
  // shows its permission dialog (some desktop browsers suppress auto-requests).
  useEffect(() => {
    if (!session) return
    if (!navigator.geolocation) {
      setGps({ status: "denied", error: "Geolocation is not supported by this browser." })
      return
    }

    if (!navigator.permissions) {
      // Permissions API not available — fall back to showing the button
      return
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          requestGps()
        } else if (result.state === "denied") {
          setGps({ status: "denied", error: "Location permission denied." })
        }
        // "prompt" → leave as idle, show the button
      })
      .catch(() => {
        // Permissions API failed — leave as idle, show the button
      })
  }, [session, requestGps])

  async function handleComplete(data: QuestionnaireCompleteData) {
    if (!gpsRef.current) return

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

    sessionStorage.setItem("lastRiskResult", JSON.stringify(data.riskResult))

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
        const body = await res.json()
        alert(body.error ?? t("duplicateAlert"))
        setSubmitting(false)
        return
      } else {
        await addPendingSubmission(payload)
      }
    } catch {
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
      {gps.status === "idle" && session && (
        <div className="rounded-lg border p-5 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("locationRequiredTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("locationPermissionPrompt")}</p>
            </div>
          </div>
          <Button onClick={requestGps} className="w-full sm:w-auto">
            <MapPin className="mr-2 h-4 w-4" />
            {t("grantLocationAccess")}
          </Button>
        </div>
      )}

      {gps.status === "requesting" && (
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
