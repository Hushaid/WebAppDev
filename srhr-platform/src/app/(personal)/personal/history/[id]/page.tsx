export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { db } from "@/lib/db"
import {
  submissions,
  riskClassifications,
} from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PersonalHealthSteps, PersonalEmergencyContacts } from "@/components/personal/health-steps"

function riskVariant(level: string | null) {
  switch (level) {
    case "high":
      return "destructive" as const
    case "medium":
      return "secondary" as const
    default:
      return "default" as const
  }
}

export default async function PersonalHistoryDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const t = await getTranslations("personal")

  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) notFound()

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1)

  if (!submission || submission.submitterId !== session.user.id) notFound()

  const [risk] = await db
    .select()
    .from(riskClassifications)
    .where(eq(riskClassifications.submissionId, id))
    .limit(1)

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">{t("detailPage.title")}</h1>
          <p className="text-sm text-muted-foreground">
            <time dateTime={submission.createdAt.toISOString()}>
              {submission.createdAt.toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </time>
          </p>
        </hgroup>
        <Link href="/personal/history">
          <Button variant="outline" size="sm">{t("detailPage.backToHistory")}</Button>
        </Link>
      </header>

      {risk ? (
        <>
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
          <PersonalEmergencyContacts />
        </>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              {t("detailPage.notAvailable")}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
