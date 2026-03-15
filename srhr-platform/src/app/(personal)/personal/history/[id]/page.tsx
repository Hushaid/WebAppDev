export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import Link from "next/link"
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
import { HealthSteps, EmergencyContacts } from "@/components/shared/health-steps"

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
          <h1 className="text-2xl font-bold">Assessment Results</h1>
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
          <Button variant="outline" size="sm">Back to history</Button>
        </Link>
      </header>

      {risk ? (
        <>
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
          <EmergencyContacts />
        </>
      ) : (
        <Card>
          <CardContent className="py-6">
            <p className="text-muted-foreground">
              Risk classification data is not available for this assessment.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
