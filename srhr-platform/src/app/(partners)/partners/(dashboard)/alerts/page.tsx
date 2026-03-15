export const dynamic = "force-dynamic"

import { getPartnerAlerts } from "./actions"
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
import { PartnerAlertActions } from "./alert-actions"
import { PaginationBar } from "@/components/pagination-bar"

/** Extract submission ID from alert message text */
function extractSubmissionId(message: string | null): string | null {
  if (!message) return null
  const match = message.match(/Submission ID:\s*([0-9a-f-]+)/)
  return match?.[1] ?? null
}

function typeBadge(type: string) {
  const labels: Record<string, string> = {
    high_risk_individual: "High Risk",
    threshold_breach: "Hotspot",
    climate_warning: "Climate",
    scheduled_summary: "Summary",
  }
  const variants: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    high_risk_individual: "destructive",
    threshold_breach: "secondary",
    climate_warning: "outline",
    scheduled_summary: "default",
  }
  return (
    <Badge variant={variants[type] ?? "outline"}>
      {labels[type] ?? type}
    </Badge>
  )
}

function statusBadge(status: string) {
  const variants: Record<string, "destructive" | "secondary" | "outline" | "default"> = {
    pending: "secondary",
    sent: "default",
    opened: "outline",
    actioned: "outline",
    dismissed: "outline",
  }
  return <Badge variant={variants[status] ?? "outline"}>{status}</Badge>
}

function riskBadge(level: string) {
  const variants: Record<string, "destructive" | "secondary" | "default"> = {
    high: "destructive",
    medium: "secondary",
    low: "default",
  }
  return <Badge variant={variants[level] ?? "default"}>{level}</Badge>
}

export default async function PartnersAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const { items: alertList, total, totalPages, pageSize } =
    await getPartnerAlerts(page)

  const pendingCount = alertList.filter(
    (a) => a.status === "pending" || a.status === "sent",
  ).length
  const highRiskCount = alertList.filter((a) => a.riskLevel === "high").length

  return (
    <div className="-m-4 sm:-m-6 flex h-[calc(100%+32px)] sm:h-[calc(100%+48px)] flex-col">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <section className="space-y-6">
          <header>
            <hgroup>
              <h1 className="text-2xl font-bold">Alerts</h1>
              <p className="text-muted-foreground">
                Risk alerts and notifications for your coverage areas.
              </p>
            </hgroup>
          </header>

          <div className="grid gap-4 grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  High Risk
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-600">{highRiskCount}</p>
              </CardContent>
            </Card>
          </div>

          {alertList.length === 0 && page === 1 ? (
            <p className="text-muted-foreground">No alerts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="table-fixed w-full min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[70px]">Risk</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertList.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{typeBadge(alert.type)}</TableCell>
                      <TableCell>{riskBadge(alert.riskLevel)}</TableCell>
                      <TableCell className="whitespace-normal break-words">
                        <p className="font-medium">{alert.title}</p>
                        {alert.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {alert.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{statusBadge(alert.status)}</TableCell>
                      <TableCell>
                        <time
                          dateTime={alert.createdAt.toISOString()}
                          className="text-sm"
                        >
                          {alert.createdAt.toLocaleDateString()}
                        </time>
                      </TableCell>
                      <TableCell>
                        <PartnerAlertActions
                          alertId={alert.id}
                          status={alert.status}
                          submissionId={extractSubmissionId(alert.message)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        basePath="/partners/alerts"
      />
    </div>
  )
}
