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
import { toast } from "sonner"

type GpsState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lng: number }
  | { status: "denied"; error: string }

export default function FieldWorkerQuestionnairePage() {
  const t = useTranslations("fieldWorker")
  const tQuestionnaire = useTranslations("questionnaire")
  const tCommon = useTranslations("common")
  const router = useRouter()
  const { data: session } = useSession()
  const [submitting, setSubmitting] = useState(false)
  const [bypassDedup, setBypassDedup] = useState(false)
  const [gps, setGps] = useState<GpsState>(() =>
    typeof navigator !== "undefined" && !navigator.geolocation
      ? { status: "denied", error: "Geolocation is not supported by this browser." }
      : { status: "idle" },
  )
  const gpsRef = useRef<{ lat: number; lng: number } | null>(null)
  const hasInitiatedGps = useRef(false)

  // fromButton: true → on failure show the denied error panel
  // fromButton: false (auto-triggered) → on failure fall back to idle so the button appears
  const requestGps = useCallback(async (fromButton = false) => {
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
              // Field workers can submit multiple assessments from the same location
              // (community outreach, health campaigns, etc.). Auto-bypass the dedup
              // check so the questionnaire opens immediately for the next subject.
              setBypassDedup(true)
            }
          }
        } catch {
          // Network error — allow through, API-level check is the final guard
        }
      }
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
  }, [session])

  // Toast on denied transition
  useEffect(() => {
    if (gps.status === "denied") {
      toast.error(t("locationRequiredTitle"), {
        description: t("locationRequiredBody"),
      })
    }
  }, [gps.status, t])

  // On mount, check if permission was already granted — if so, auto-request
  // without a button click to avoid unnecessary friction.
  // Guard with hasInitiatedGps so session re-fetches on tab focus don't re-run
  // this and wipe out GPS state (and the questionnaire) mid-fill.
  useEffect(() => {
    if (!session) return
    if (!navigator.geolocation) return
    if (hasInitiatedGps.current) return
    hasInitiatedGps.current = true

    if (!navigator.permissions) {
      return
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          requestGps(false)
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
      bypassDedup: bypassDedup || undefined,
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
          <p className="text-sm text-muted-foreground">
            {t("locationRequiredBody")}
          </p>
          <p className="text-xs text-muted-foreground">Error: {gps.error}</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            {t("reloadPage")}
          </Button>
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
