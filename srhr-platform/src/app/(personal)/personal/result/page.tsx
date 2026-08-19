"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PersonalHealthSteps, PersonalEmergencyContacts } from "@/components/personal/health-steps"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  const t = useTranslations("personal")
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
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
          <h1 className="text-2xl font-bold">{t("resultsPage.title")}</h1>
          <p className="text-muted-foreground">{t("resultsPage.noResults")}</p>
        </header>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/personal/questionnaire">{t("takeAssessment")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/personal">{t("resultsPage.backToDashboard")}</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {userName ? t("resultsPage.titleWithName", { name: userName }) : t("resultsPage.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("resultsPage.disclaimer")}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t("detailPage.overallRisk")}
            <Badge variant={riskVariant(risk.overallRiskLevel)} className="text-sm">
              {t(`riskWord.${risk.overallRiskLevel}`).toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t("aggregateScore")}: {risk.aggregateScore}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <dt className="text-muted-foreground">{t("infectionRisk")}</dt>
            <dd className="text-end">
              <Badge variant={riskVariant(risk.stiRiskLevel)}>
                {t(`riskWord.${risk.stiRiskLevel}`)} ({risk.stiScore})
              </Badge>
            </dd>

            {risk.maternalRiskLevel && (
              <>
                <dt className="text-muted-foreground">{t("maternalHealth")}</dt>
                <dd className="text-end">
                  <Badge variant={riskVariant(risk.maternalRiskLevel)}>
                    {t(`riskWord.${risk.maternalRiskLevel}`)} ({risk.maternalScore})
                  </Badge>
                </dd>
              </>
            )}

            <dt className="text-muted-foreground">{t("communityWellbeing")}</dt>
            <dd className="text-end">
              <Badge variant={riskVariant(risk.communityWellbeingRiskLevel)}>
                {t(`riskWord.${risk.communityWellbeingRiskLevel}`)} ({risk.communityWellbeingScore})
              </Badge>
            </dd>
          </dl>
        </CardContent>
      </Card>

      <PersonalHealthSteps riskLevel={risk.overallRiskLevel as "low" | "medium" | "high"} />

      <Accordion type="single" collapsible className="rounded-lg border">
        <AccordionItem value="facilities" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <span className="text-base font-semibold">{t("resultsPage.facilitiesTitle")}</span>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-4">
            <p className="mb-4 text-sm text-muted-foreground">
              {loading
                ? t("resultsPage.facilitiesLoading")
                : facilities.length > 0
                  ? t("resultsPage.facilitiesFound")
                  : t("resultsPage.facilitiesNone")}
            </p>
            {facilities.length > 0 && (
              <ul className="space-y-3">
                {facilities.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-lg border p-3">
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
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <PersonalEmergencyContacts />

      <nav className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/personal/questionnaire">{t("resultsPage.takeAnother")}</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/personal">{t("resultsPage.backToDashboard")}</Link>
        </Button>
      </nav>
    </section>
  )
}
