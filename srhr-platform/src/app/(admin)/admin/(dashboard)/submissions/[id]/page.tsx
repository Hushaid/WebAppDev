export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getSubmissionDetail } from "../actions"
import { SCORED_QUESTIONS } from "@/lib/scoring/questions-config"
import { reverseGeocode } from "@/lib/utils/reverse-geocode"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PiiDownload } from "./pii-download"

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

export default async function SubmissionDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const detail = await getSubmissionDetail(id)

  if (!detail) notFound()

  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const { submission, responses, classification, submitter } = detail

  // Extract PII contact responses (Q44 = phone/WhatsApp)
  const piiQuestionIds = ["Q44"]
  const piiLabels: Record<string, string> = {
    Q44: "Phone / WhatsApp number",
  }
  const contactResponses = responses
    .filter((r) => {
      const qNum = r.questionNumber ?? r.questionId
      return piiQuestionIds.includes(qNum)
    })
    .map((r) => ({
      question: piiLabels[r.questionNumber ?? r.questionId] ?? r.questionNumber ?? r.questionId,
      value: r.responseValue,
    }))

  // Reverse geocode the GPS coordinates
  let locationName: string | null = null
  if (submission.gpsLat && submission.gpsLng) {
    locationName = await reverseGeocode(
      parseFloat(submission.gpsLat),
      parseFloat(submission.gpsLng),
    )
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">
            Submission Detail
            {submission.flaggedForReview && (
              <Badge variant="secondary" className="ml-3 text-orange-600 bg-orange-100">
                Flagged for Review
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            <code className="text-xs">{submission.id}</code>
          </p>
        </hgroup>
        <Link href="/admin/submissions">
          <Button variant="outline">Back to submissions</Button>
        </Link>
      </header>

      {/* Submission metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Submission Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Submitter
              </dt>
              <dd>
                {submitter
                  ? `${submitter.name} (${submitter.email})`
                  : submission.submitterId}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Type
              </dt>
              <dd>
                <Badge variant="outline">
                  {submission.submitterType.replace("_", " ")}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Location
              </dt>
              <dd>
                {submission.gpsLat ? (
                  <>
                    {locationName && (
                      <span className="block">{locationName}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {parseFloat(submission.gpsLat).toFixed(6)}, {parseFloat(submission.gpsLng!).toFixed(6)}
                    </span>
                  </>
                ) : (
                  "Not captured"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Submitted At
              </dt>
              <dd>
                <time dateTime={submission.createdAt.toISOString()}>
                  {submission.createdAt.toLocaleString()}
                </time>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* PII access */}
      {session?.user?.id && (
        <PiiDownload
          submissionId={submission.id}
          actorId={session.user.id}
          contactResponses={contactResponses}
        />
      )}

      {/* Risk classification */}
      {classification && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Risk Classification
              <Badge
                variant={riskVariant(classification.overallRiskLevel)}
                className="text-sm"
              >
                Overall: {classification.overallRiskLevel.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">Infection Risk</dt>
                <dd className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {classification.stiScore}
                  </span>
                  <Badge variant={riskVariant(classification.stiRiskLevel)}>
                    {classification.stiRiskLevel}
                  </Badge>
                </dd>
              </div>
              {classification.maternalRiskLevel && (
                <div className="rounded-lg border p-3">
                  <dt className="text-sm text-muted-foreground">
                    Maternal Health
                  </dt>
                  <dd className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {classification.maternalScore}
                    </span>
                    <Badge
                      variant={riskVariant(classification.maternalRiskLevel)}
                    >
                      {classification.maternalRiskLevel}
                    </Badge>
                  </dd>
                </div>
              )}
              <div className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">
                  Community Well-being
                </dt>
                <dd className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {classification.communityWellbeingScore}
                  </span>
                  <Badge
                    variant={riskVariant(
                      classification.communityWellbeingRiskLevel,
                    )}
                  >
                    {classification.communityWellbeingRiskLevel}
                  </Badge>
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted-foreground">
              Aggregate score: {classification.aggregateScore} · Model:{" "}
              {classification.modelVersion}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Individual responses */}
      <Card>
        <CardHeader>
          <CardTitle>
            Question Responses ({responses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Response</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((r) => {
                const qNum = r.questionNumber ?? r.questionId
                const config = SCORED_QUESTIONS.find(
                  (q) => q.id === qNum,
                )
                const option = config?.options.find(
                  (o) => o.value === r.responseValue,
                )
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="font-mono text-xs">{qNum}</span>
                      {config && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {config.diseaseGroup}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {option ? option.label : r.responseValue}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r.score}
                      {config && (
                        <span className="text-muted-foreground">
                          /{config.maxScore}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
