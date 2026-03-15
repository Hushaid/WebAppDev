export const dynamic = "force-dynamic"

import Link from "next/link"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { submissions, riskClassifications } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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

export default async function PersonalHomePage() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const userName = session?.user?.name ?? ""

  const userId = session?.user?.id
  let latestSubmission: {
    id: string
    createdAt: Date
    overallRiskLevel: string | null
    aggregateScore: number | null
    stiRiskLevel: string | null
    stiScore: number | null
    maternalRiskLevel: string | null
    maternalScore: number | null
    communityWellbeingRiskLevel: string | null
    communityWellbeingScore: number | null
  } | null = null

  if (userId) {
    const [row] = await db
      .select({
        id: submissions.id,
        createdAt: submissions.createdAt,
        overallRiskLevel: riskClassifications.overallRiskLevel,
        aggregateScore: riskClassifications.aggregateScore,
        stiRiskLevel: riskClassifications.stiRiskLevel,
        stiScore: riskClassifications.stiScore,
        maternalRiskLevel: riskClassifications.maternalRiskLevel,
        maternalScore: riskClassifications.maternalScore,
        communityWellbeingRiskLevel: riskClassifications.communityWellbeingRiskLevel,
        communityWellbeingScore: riskClassifications.communityWellbeingScore,
      })
      .from(submissions)
      .leftJoin(riskClassifications, eq(riskClassifications.submissionId, submissions.id))
      .where(eq(submissions.submitterId, userId))
      .orderBy(desc(submissions.createdAt))
      .limit(1)

    latestSubmission = row ?? null
  }

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">
            Welcome{userName ? `, ${userName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Your confidential health assessment dashboard. All your data is encrypted and private.
          </p>
        </hgroup>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link href="/personal/questionnaire">Take assessment</Link>
          </Button>
          {latestSubmission && (
            <Button variant="outline" asChild>
              <Link href={`/personal/history/${latestSubmission.id}`}>View last result</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {latestSubmission?.overallRiskLevel ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Latest Result
              <Badge variant={riskVariant(latestSubmission.overallRiskLevel)} className="text-sm">
                {latestSubmission.overallRiskLevel.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Taken on{" "}
              <time dateTime={latestSubmission.createdAt.toISOString()}>
                {latestSubmission.createdAt.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {" · "}Aggregate score: {latestSubmission.aggregateScore}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <dt className="text-muted-foreground">Infection Risk</dt>
              <dd className="text-end">
                <Badge variant={riskVariant(latestSubmission.stiRiskLevel)}>
                  {latestSubmission.stiRiskLevel} ({latestSubmission.stiScore})
                </Badge>
              </dd>

              {latestSubmission.maternalRiskLevel && (
                <>
                  <dt className="text-muted-foreground">Maternal Health</dt>
                  <dd className="text-end">
                    <Badge variant={riskVariant(latestSubmission.maternalRiskLevel)}>
                      {latestSubmission.maternalRiskLevel} ({latestSubmission.maternalScore})
                    </Badge>
                  </dd>
                </>
              )}

              <dt className="text-muted-foreground">Community Well-being</dt>
              <dd className="text-end">
                <Badge variant={riskVariant(latestSubmission.communityWellbeingRiskLevel)}>
                  {latestSubmission.communityWellbeingRiskLevel} ({latestSubmission.communityWellbeingScore})
                </Badge>
              </dd>
            </dl>

            <div className="mt-4">
              <Link href="/personal/history" className="text-sm text-primary hover:underline">
                View all assessments
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have not taken any assessments yet. Complete your first
              health assessment to receive a personalised risk profile and facility recommendations.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
