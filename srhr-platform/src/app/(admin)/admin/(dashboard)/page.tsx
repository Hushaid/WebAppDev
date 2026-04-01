export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { users, submissions, riskClassifications } from "@/lib/db/schema"
import { eq, gte, sql, count, desc } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

async function getDashboardStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)

  const [
    [totalUsers],
    [fieldWorkers],
    [todaySubmissions],
    [weekSubmissions],
    [highRiskAlerts],
    recentSubmissions,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, "field_worker")),
    db
      .select({ count: count() })
      .from(submissions)
      .where(gte(submissions.createdAt, todayStart)),
    db
      .select({ count: count() })
      .from(submissions)
      .where(gte(submissions.createdAt, weekStart)),
    db
      .select({ count: count() })
      .from(riskClassifications)
      .where(eq(riskClassifications.overallRiskLevel, "high")),
    db
      .select({
        id: submissions.id,
        submitterType: submissions.submitterType,
        createdAt: submissions.createdAt,
        overallRiskLevel: riskClassifications.overallRiskLevel,
      })
      .from(submissions)
      .leftJoin(
        riskClassifications,
        eq(submissions.id, riskClassifications.submissionId),
      )
      .orderBy(sql`${submissions.createdAt} DESC`)
      .limit(5),
  ])

  // Risk type breakdown
  const riskBreakdown = await db
    .select({
      stiHigh: sql<number>`count(*) filter (where ${riskClassifications.stiRiskLevel} = 'high')::int`,
      stiMedium: sql<number>`count(*) filter (where ${riskClassifications.stiRiskLevel} = 'medium')::int`,
      maternalHigh: sql<number>`count(*) filter (where ${riskClassifications.maternalRiskLevel} = 'high')::int`,
      maternalMedium: sql<number>`count(*) filter (where ${riskClassifications.maternalRiskLevel} = 'medium')::int`,
      communityHigh: sql<number>`count(*) filter (where ${riskClassifications.communityWellbeingRiskLevel} = 'high')::int`,
      communityMedium: sql<number>`count(*) filter (where ${riskClassifications.communityWellbeingRiskLevel} = 'medium')::int`,
    })
    .from(riskClassifications)

  // Field worker activity (top 10 by submission count)
  const fieldWorkerActivity = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      submissionCount: count(submissions.id),
    })
    .from(users)
    .leftJoin(submissions, eq(users.id, submissions.submitterId))
    .where(eq(users.role, "field_worker"))
    .groupBy(users.id, users.name, users.email)
    .orderBy(desc(count(submissions.id)))
    .limit(10)

  return {
    totalUsers: totalUsers?.count ?? 0,
    fieldWorkers: fieldWorkers?.count ?? 0,
    todaySubmissions: todaySubmissions?.count ?? 0,
    weekSubmissions: weekSubmissions?.count ?? 0,
    highRiskAlerts: highRiskAlerts?.count ?? 0,
    recentSubmissions,
    riskBreakdown: riskBreakdown[0] ?? { stiHigh: 0, stiMedium: 0, maternalHigh: 0, maternalMedium: 0, communityHigh: 0, communityMedium: 0 },
    fieldWorkerActivity,
  }
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
}

export default async function AdminDashboard() {
  const [stats, session] = await Promise.all([
    getDashboardStats(),
    auth.api.getSession({ headers: await headers() }),
  ])
  const adminName = session?.user?.name

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">
          {adminName ? `Welcome, ${adminName}` : "Admin Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Monitor platform activity, track assessments, and manage health risk data across all users.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Field Workers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.fieldWorkers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submissions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.todaySubmissions}</p>
            <p className="text-xs text-muted-foreground">
              {stats.weekSubmissions} this week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk Classifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {stats.highRiskAlerts}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">STI Risk</p>
              <div className="mt-2 flex items-center gap-3">
                <Badge className="bg-red-100 text-red-800">{stats.riskBreakdown.stiHigh} high</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.riskBreakdown.stiMedium} medium</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Maternal Health</p>
              <div className="mt-2 flex items-center gap-3">
                <Badge className="bg-red-100 text-red-800">{stats.riskBreakdown.maternalHigh} high</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.riskBreakdown.maternalMedium} medium</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium text-muted-foreground">Community Wellbeing</p>
              <div className="mt-2 flex items-center gap-3">
                <Badge className="bg-red-100 text-red-800">{stats.riskBreakdown.communityHigh} high</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">{stats.riskBreakdown.communityMedium} medium</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
      {/* Field Worker Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Field Worker Activity</CardTitle>
            <Link href="/admin/users?role=field_worker" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.fieldWorkerActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No field workers registered yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.fieldWorkerActivity.map((fw) => (
                <li key={fw.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{fw.name ?? fw.email}</p>
                    <p className="text-xs text-muted-foreground">{fw.email}</p>
                  </div>
                  <Badge variant="secondary">{fw.submissionCount} submissions</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Submissions</CardTitle>
            <Link
              href="/admin/submissions"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentSubmissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No assessments have been submitted yet. They will appear here once field workers or individuals begin submitting.
            </p>
          ) : (
            <ul className="space-y-3">
              {stats.recentSubmissions.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/admin/submissions/${sub.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {sub.id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.submitterType === "field_worker"
                          ? "Field Worker"
                          : "Personal"}{" "}
                        &middot;{" "}
                        {sub.createdAt
                          ? new Date(sub.createdAt).toLocaleString()
                          : ""}
                      </p>
                    </div>
                    {sub.overallRiskLevel && (
                      <Badge
                        className={riskColors[sub.overallRiskLevel] || ""}
                      >
                        {sub.overallRiskLevel}
                      </Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      </div>
    </section>
  )
}
