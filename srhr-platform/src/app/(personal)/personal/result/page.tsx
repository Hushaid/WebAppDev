"use client"

import { useEffect, useState } from "react"
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
import Link from "next/link"

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

export default function PersonalResultPage() {
  const [risk, setRisk] = useState<RiskData | null>(null)
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem("lastRiskResult")
    if (stored) {
      setRisk(JSON.parse(stored))
    }

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
        if (res.ok) {
          setFacilities(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }

    loadFacilities()
  }, [])

  if (!risk) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Your Results</h1>
          <p className="text-muted-foreground">No results found. Complete a health assessment first to see your results here.</p>
        </header>
        <Link href="/personal/questionnaire">
          <Button>Take assessment</Button>
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Your Results</h1>
        <p className="text-muted-foreground">
          Based on your answers, here is your personalised health risk summary. This is not a medical diagnosis — please consult a healthcare provider for professional advice.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Overall Risk
            <Badge variant={riskVariant(risk.overallRiskLevel)} className="text-sm">
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
                {risk.communityWellbeingRiskLevel} ({risk.communityWellbeingScore})
              </Badge>
            </dd>
          </dl>
        </CardContent>
      </Card>

      <HealthSteps riskLevel={risk.overallRiskLevel as "low" | "medium" | "high"} />

      <Card>
        <CardHeader>
          <CardTitle>Recommended facilities</CardTitle>
          <CardDescription>
            {loading
              ? "Finding health facilities near you..."
              : facilities.length > 0
                ? "These health facilities are near your location and can provide support."
                : "No nearby facilities found. Please contact your local health centre for assistance."}
          </CardDescription>
        </CardHeader>
        {facilities.length > 0 && (
          <CardContent>
            <ul className="space-y-3">
              {facilities.map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                  <hgroup>
                    <h3 className="font-medium">{f.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {f.type}
                      {f.ward ? ` · ${f.ward}` : ""}
                      {f.lga ? `, ${f.lga} LGA` : ""}
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

      <nav>
        <Link href="/personal/questionnaire">
          <Button variant="outline">Take another assessment</Button>
        </Link>
      </nav>
    </section>
  )
}
