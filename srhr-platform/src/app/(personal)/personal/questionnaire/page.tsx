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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"
import { toast } from "sonner"

type GpsState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied"; error: string }

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
  const [gps, setGps] = useState<GpsState>(() =>
    typeof navigator !== "undefined" && !navigator.geolocation
      ? { status: "denied", error: "Geolocation is not supported by this browser." }
      : { status: "idle" },
  )
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null)

  // fromButton: true → on failure show the denied error panel
  // fromButton: false (auto-triggered) → on failure fall back to idle so the button appears
  const requestGps = useCallback(async (fromButton = false) => {
    setGps({ status: "requesting" })
    try {
      const pos = await captureGps()
      gpsRef.current = { lat: pos.lat, lng: pos.lng }
      sessionStorage.setItem("lastGps", JSON.stringify({ lat: pos.lat, lng: pos.lng }))
      setGps({ status: "granted", lat: pos.lat, lng: pos.lng })
    } catch (err: unknown) {
      if (!fromButton) {
        // Auto-request failed (e.g. stale browser permission) — show the button
        setGps({ status: "idle" })
      } else {
        const message = err instanceof Error ? err.message : "Failed to get location."
        setGps({ status: "denied", error: message })
      }
    }
  }, [])

  // On mount check if permission already granted — auto-request without button friction.
  // If "prompt" or unknown, require a user gesture so the browser shows its dialog.
  useEffect(() => {
    if (!navigator.geolocation) return // already set as denied in useState initializer
    if (!navigator.permissions) return
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          requestGps(false)
        } else if (result.state === "denied") {
          setGps({ status: "denied", error: "Location permission denied." })
        }
      })
      .catch(() => {})
  }, [requestGps])

  // Toast on denied transition
  useEffect(() => {
    if (gps.status === "denied") {
      toast.error(t("locationRequiredTitle"), {
        description: t("locationRequiredBody"),
      })
    }
  }, [gps.status, t])

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
    if (gps.status !== "granted") return
    setSubmitting(true)

    const gpsLat = gps.lat.toString()
    const gpsLng = gps.lng.toString()

    if (!session?.user?.id) {
      router.push("/log-in")
      return
    }

    sessionStorage.setItem("lastRiskResult", JSON.stringify(data.riskResult))

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
                {t("cooldownAfter", { time: endsAt.toLocaleString() })}
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

      {/* GPS required gate */}
      {gps.status === "idle" && (
        <div className="rounded-lg border p-5 space-y-4">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("locationRequiredTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("locationPermissionPrompt")}</p>
            </div>
          </div>
          <Button onClick={() => requestGps(true)} className="w-full sm:w-auto">
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
          <p className="text-sm text-muted-foreground">{t("locationRequiredBody")}</p>
          <p className="text-xs text-muted-foreground">Error: {gps.error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t("reloadPage")}
          </Button>
        </div>
      )}

      {!submitting && gps.status === "granted" && (
        <QuestionnaireWizard
          submitterType="personal_user"
          onComplete={handleComplete}
        />
      )}
    </section>
  )
}
