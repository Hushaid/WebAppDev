"use client"

import { useElectricShape } from "@/lib/electric/use-shape"
import type { SubmissionRow } from "@/lib/electric/shapes"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FieldWorkerDashboardPage() {
  const { data: submissions, isLoading } = useElectricShape<SubmissionRow>(
    "submissions",
    // TODO: filter by current user ID
  )

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = submissions.filter(
    (s) => (s.created_at as string).slice(0, 10) === today,
  ).length

  const thisWeekStart = new Date()
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
  const weekStart = thisWeekStart.toISOString().slice(0, 10)
  const weekCount = submissions.filter(
    (s) => (s.created_at as string).slice(0, 10) >= weekStart,
  ).length

  const withGps = submissions.filter((s) => s.gps_lat).length

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Your field activity summary.
          </p>
        </hgroup>
        <Link href="/field-worker/questionnaire">
          <Button>New Assessment</Button>
        </Link>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground">Loading activity...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{weekCount}</p>
                <p className="text-xs text-muted-foreground">submissions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{submissions.length}</p>
                <p className="text-xs text-muted-foreground">
                  {withGps} with GPS
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent submissions */}
          {submissions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {submissions.slice(-5).reverse().map((sub) => (
                    <li
                      key={sub.id as string}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <hgroup>
                        <p className="text-sm font-medium">
                          <code className="text-xs">
                            {(sub.id as string).slice(0, 8)}...
                          </code>
                        </p>
                        <time
                          dateTime={sub.created_at as string}
                          className="text-xs text-muted-foreground"
                        >
                          {new Date(
                            sub.created_at as string,
                          ).toLocaleString()}
                        </time>
                      </hgroup>
                      <span className="flex items-center gap-2">
                        {sub.gps_lat ? (
                          <Badge variant="secondary">GPS</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {(sub.submitter_type as string).replace("_", " ")}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <nav className="flex gap-3">
            <Link href="/field-worker/questionnaire">
              <Button>New Assessment</Button>
            </Link>
            <Link href="/field-worker/history">
              <Button variant="outline">View All History</Button>
            </Link>
          </nav>
        </>
      )}
    </section>
  )
}
