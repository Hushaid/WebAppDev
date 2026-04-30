"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HealthSteps, EmergencyContacts } from "@/components/shared/health-steps"
import { Flag, UserCheck } from "lucide-react"
import Link from "next/link"

interface RiskData {
  stiScore: number
  stiRiskLevel: string
  maternalScore: number | null
  maternalRiskLevel: string | null
  communityWellbeingScore: number
  communityWellbeingRiskLevel: string
  overallRiskLevel: string
  aggregateScore: number
}

interface Facility {
  id: string
  name: string
  type: string
  ward: string | null
  lga: string | null
  gpsLat: string | null
  gpsLng: string | null
  distance_km?: number
}

function riskVariant(level: string) {
  switch (level) {
    case "high":
      return "destructive" as const
    case "medium":
      return "secondary" as const
    default:
      return "default" as const
  }
}

export default function FieldWorkerResultPage() {
  const [risk, setRisk] = useState<RiskData | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [flagged, setFlagged] = useState(false)
  const [flagging, setFlagging] = useState(false)
  const [referred, setReferred] = useState(false)
  const [referring, setReferring] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem("lastRiskResult")
    if (stored) setRisk(JSON.parse(stored))

    const storedId = sessionStorage.getItem("lastSubmissionId")
    if (storedId) setSubmissionId(storedId)

    async function loadFacilities() {
      try {
        const gpsStored = sessionStorage.getItem("lastGps")
        const params = new URLSearchParams({ limit: "5" })
        if (gpsStored) {
          const gps = JSON.parse(gpsStored)
          params.set("lat", gps.lat.toString())
          params.set("lng", gps.lng.toString())
        }
        const res = await fetch(`/api/facilities?${params}`)
        if (res.ok) setFacilities(await res.json())
      } finally {
        setLoading(false)
      }
    }

    loadFacilities()
  }, [])

  if (!risk) {
    return (
      <section className="mx-auto max-w-2xl space-y-6 p-4">
        <header>
          <h1 className="text-2xl font-bold">Assessment Result</h1>
          <p className="text-muted-foreground">No result data found. Please complete an assessment first.</p>
        </header>
        <Button asChild>
          <Link href="/field-worker/questionnaire">New assessment</Link>
        </Button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Assessment Result</h1>
        {submissionId && (
          <p className="text-xs text-muted-foreground">
            ID: {submissionId.slice(0, 8)}...
          </p>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Risk Classification
            <Badge
              variant={riskVariant(risk.overallRiskLevel)}
              className="text-sm"
            >
              {risk.overallRiskLevel.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Aggregate score: {risk.aggregateScore}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="text-muted-foreground">Infection Risk</dt>
            <dd className="text-end">
              <Badge variant={riskVariant(risk.stiRiskLevel)}>
                {risk.stiRiskLevel} ({risk.stiScore})
              </Badge>
            </dd>

            {risk.maternalRiskLevel && (
              <>
                <dt className="text-muted-foreground">Maternal Health</dt>
                <dd className="text-end">
                  <Badge variant={riskVariant(risk.maternalRiskLevel)}>
                    {risk.maternalRiskLevel} ({risk.maternalScore})
                  </Badge>
                </dd>
              </>
            )}

            <dt className="text-muted-foreground">Community Well-being</dt>
            <dd className="text-end">
              <Badge variant={riskVariant(risk.communityWellbeingRiskLevel)}>
                {risk.communityWellbeingRiskLevel} (
                {risk.communityWellbeingScore})
              </Badge>
            </dd>
          </dl>
        </CardContent>
      </Card>

      <HealthSteps riskLevel={risk.overallRiskLevel as "low" | "medium" | "high"} />

      <Card>
        <CardHeader>
          <CardTitle>Nearest facilities for referral</CardTitle>
          <CardDescription>
            {loading
              ? "Loading nearby facilities..."
              : facilities.length > 0
                ? "You can recommend these facilities to the person you assessed."
                : "No nearby facilities found. Refer them to their local health centre."}
          </CardDescription>
        </CardHeader>
        {facilities.length > 0 && (
          <CardContent>
            <ul className="space-y-3">
              {facilities.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <hgroup>
                    <h3 className="font-medium">{f.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {f.type}
                      {f.ward ? ` · ${f.ward}` : ""}
                      {f.lga ? `, ${f.lga}` : ""}
                    </p>
                  </hgroup>
                  {f.distance_km !== undefined && (
                    <Badge variant="outline">
                      {f.distance_km.toFixed(1)} km
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      <EmergencyContacts />

      <nav className="flex gap-3">
        <Button asChild>
          <Link href="/field-worker/questionnaire">New assessment</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/field-worker/history">View history</Link>
        </Button>
        {submissionId && !flagged && (
          <Button
            variant="outline"
            disabled={flagging}
            onClick={async () => {
              setFlagging(true)
              try {
                const res = await fetch("/api/submissions/flag", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ submissionId }),
                })
                if (res.ok) {
                  setFlagged(true)
                  toast.success("Submission flagged for admin review")
                } else {
                  toast.error("Failed to flag submission")
                }
              } catch {
                toast.error("Failed to flag submission")
              } finally {
                setFlagging(false)
              }
            }}
          >
            <Flag className="mr-2 h-4 w-4" />
            Flag for review
          </Button>
        )}
        {flagged && (
          <Button variant="outline" disabled>
            <Flag className="mr-2 h-4 w-4" />
            Flagged
          </Button>
        )}
        {submissionId && (risk?.overallRiskLevel === "high" || risk?.overallRiskLevel === "medium") && !referred && (
          <Button
            variant="outline"
            disabled={referring}
            onClick={async () => {
              setReferring(true)
              try {
                const res = await fetch("/api/submissions/refer", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ submissionId }),
                })
                if (res.ok) {
                  setReferred(true)
                  toast.success("Marked as referred for further support")
                } else {
                  toast.error("Failed to record referral")
                }
              } catch {
                toast.error("Failed to record referral")
              } finally {
                setReferring(false)
              }
            }}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            {referring ? "Recording…" : "Mark as Referred"}
          </Button>
        )}
        {referred && (
          <Button variant="outline" disabled>
            <UserCheck className="mr-2 h-4 w-4" />
            Referred
          </Button>
        )}
      </nav>
    </section>
  )
}
