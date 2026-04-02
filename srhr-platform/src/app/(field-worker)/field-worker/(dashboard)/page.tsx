"use client"

import { useTranslations } from "next-intl"
import { useSession } from "@/lib/auth/client"
import { useSubmissions } from "@/lib/hooks/use-submissions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function FieldWorkerDashboardPage() {
  const t = useTranslations("fieldWorker")
  const tDashboard = useTranslations("dashboard")
  const { data: session } = useSession()
  const userId = session?.user?.id
  const { data: submissions } = useSubmissions(userId)

  const today = new Date().toISOString().slice(0, 10)
  const todayCount = submissions.filter(
    (s) => s.created_at.slice(0, 10) === today,
  ).length

  const thisWeekStart = new Date()
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
  const weekStart = thisWeekStart.toISOString().slice(0, 10)
  const weekCount = submissions.filter(
    (s) => s.created_at.slice(0, 10) >= weekStart,
  ).length

  const withGps = submissions.filter((s) => s.gps_lat).length

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <hgroup>
          <h1 className="text-2xl font-bold">
            {session?.user?.name
              ? t("welcomeWithName", { name: session.user.name })
              : t("dashboardTitle")}
          </h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </hgroup>
        <Link href="/field-worker/questionnaire">
          <Button>{t("newAssessment")}</Button>
        </Link>
      </header>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12h4"/><path d="M12 10v4"/></svg>
            </div>
            <h3 className="text-lg font-semibold">{t("noAssessmentsYetTitle")}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t("noAssessmentsYetBody")}
            </p>
            <Link href="/field-worker/questionnaire" className="mt-6 inline-block">
              <Button>{t("startFirstAssessment")}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tDashboard("todayCount")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{todayCount}</p>
                <p className="text-xs text-muted-foreground">{t("submissions")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tDashboard("weekCount")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{weekCount}</p>
                <p className="text-xs text-muted-foreground">{t("submissions")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("total")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{submissions.length}</p>
                <p className="text-xs text-muted-foreground">
                  {t("withLocationCaptured", { count: withGps })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tDashboard("recentSubmissions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {submissions.slice(0, 5).map((sub) => (
                  <li key={sub.id}>
                    <Link
                      href={`/field-worker/history/${sub.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <hgroup>
                        <p className="text-sm font-medium">
                          <code className="text-xs">
                            {sub.id.slice(0, 8)}...
                          </code>
                        </p>
                        <time
                          dateTime={sub.created_at}
                          className="text-xs text-muted-foreground"
                        >
                          {new Date(sub.created_at).toLocaleString()}
                        </time>
                      </hgroup>
                      <span className="flex items-center gap-2">
                        {sub.gps_lat ? (
                          <Badge variant="secondary">{t("locationCaptured")}</Badge>
                        ) : null}
                        <Badge variant="outline">
                          {sub.submitter_type.replace("_", " ")}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

        </>
      )}
    </section>
  )
}
