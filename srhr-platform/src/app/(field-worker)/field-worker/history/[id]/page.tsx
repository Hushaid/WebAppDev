export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { submissions, questionResponses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { SCORED_QUESTIONS } from "@/lib/scoring/questions-config"
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

  const responses = await db
    .select()
    .from(questionResponses)
    .where(eq(questionResponses.submissionId, id))

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">Submission Detail</h1>
          <p className="text-muted-foreground">
            <code className="text-xs">{submission.id}</code>
          </p>
        </hgroup>
        <Link href="/field-worker/history">
          <Button variant="outline">Back to History</Button>
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Submission Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
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
                GPS Location
              </dt>
              <dd>
                {submission.gpsLat
                  ? `${parseFloat(submission.gpsLat).toFixed(6)}, ${parseFloat(submission.gpsLng!).toFixed(6)}`
                  : "Not captured"}
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

      <Card>
        <CardHeader>
          <CardTitle>Responses ({responses.length})</CardTitle>
        </CardHeader>
        <CardContent>
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
                const config = SCORED_QUESTIONS.find(
                  (q) => q.id === r.questionId,
                )
                const option = config?.options.find(
                  (o) => o.value === r.responseValue,
                )
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <span className="font-mono text-xs">{r.questionId}</span>
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
        </CardContent>
      </Card>
    </section>
  )
}
