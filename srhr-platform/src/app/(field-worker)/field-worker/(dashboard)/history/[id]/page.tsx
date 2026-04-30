export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { submissions, questionResponses, questions, riskClassifications } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
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
import { SubmissionActions } from "./submission-actions"

export default async function FieldWorkerSubmissionDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const [submission] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1)

  if (!submission) notFound()

  // Risk classification (may not exist for very old submissions)
  const [risk] = await db
    .select({
      overallRiskLevel: riskClassifications.overallRiskLevel,
    })
    .from(riskClassifications)
    .where(eq(riskClassifications.submissionId, id))
    .limit(1)

  const isHighOrMedium =
    risk?.overallRiskLevel === "high" || risk?.overallRiskLevel === "medium"

  // Reverse geocode GPS coordinates
  let locationName: string | null = null
  if (submission.gpsLat && submission.gpsLng) {
    locationName = await reverseGeocode(
      parseFloat(submission.gpsLat),
      parseFloat(submission.gpsLng),
    )
  }

  // Join responses with questions for display
  const responses = await db
    .select({
      id: questionResponses.id,
      questionId: questionResponses.questionId,
      questionNumber: questions.questionNumber,
      responseValue: questionResponses.responseValue,
      score: questionResponses.score,
    })
    .from(questionResponses)
    .leftJoin(questions, eq(questionResponses.questionId, questions.id))
    .where(eq(questionResponses.submissionId, id))

  return (
    <div className="-m-4 flex h-[calc(100%+32px)] flex-col">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <section className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold">Submission Detail</h1>
            <p className="text-muted-foreground">
              <code className="text-xs">{submission.id}</code>
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle>Submission Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Type</dt>
                  <dd>
                    <Badge variant="outline">
                      {submission.submitterType.replace("_", " ")}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                  <dd>
                    {submission.gpsLat ? (
                      <>
                        {locationName && <span className="block">{locationName}</span>}
                        <span className="text-sm text-muted-foreground">
                          {parseFloat(submission.gpsLat).toFixed(6)},{" "}
                          {parseFloat(submission.gpsLng!).toFixed(6)}
                        </span>
                      </>
                    ) : (
                      "Not captured"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Submitted At</dt>
                  <dd>
                    <time dateTime={submission.createdAt.toISOString()}>
                      {submission.createdAt.toLocaleString()}
                    </time>
                  </dd>
                </div>
                {risk && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Risk Level</dt>
                    <dd>
                      <Badge
                        variant={
                          risk.overallRiskLevel === "high"
                            ? "destructive"
                            : risk.overallRiskLevel === "medium"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {risk.overallRiskLevel.toUpperCase()}
                      </Badge>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responses ({responses.length})</CardTitle>
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
                      const config = SCORED_QUESTIONS.find((q) => q.id === qNum)
                      const option = config?.options.find((o) => o.value === r.responseValue)
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
                          <TableCell>{option ? option.label : r.responseValue}</TableCell>
                          <TableCell className="text-right font-mono">
                            {r.score}
                            {config && (
                              <span className="text-muted-foreground">/{config.maxScore}</span>
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
      </div>

      {/* Fixed action bar */}
      <SubmissionActions
        submissionId={submission.id}
        initialFlagged={submission.flaggedForReview}
        initialReferred={submission.referred}
        isHighOrMedium={isHighOrMedium}
      />
    </div>
  )
}
