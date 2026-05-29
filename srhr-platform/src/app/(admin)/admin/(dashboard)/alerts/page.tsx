export const dynamic = "force-dynamic"

import { getAlerts, getPendingReviewCount } from "./actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PaginationBar } from "@/components/pagination-bar"
import { AlertActions } from "./alert-actions"
import Link from "next/link"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

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
    pending_review: "destructive",
    sent: "default",
    opened: "outline",
    actioned: "outline",
    dismissed: "outline",
  }
  const labels: Record<string, string> = {
    pending_review: "pending review",
  }
  return <Badge variant={variants[status] ?? "outline"}>{labels[status] ?? status}</Badge>
}

function riskBadge(level: string) {
  const variants: Record<string, "destructive" | "secondary" | "default"> = {
    high: "destructive",
    medium: "secondary",
    low: "default",
  }
  return <Badge variant={variants[level] ?? "default"}>{level}</Badge>
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1)
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  const isSuperAdmin = callerRole === "super_admin"

  const [{ items: alertList, total, totalPages, pageSize }, pendingCount] = await Promise.all([
    getAlerts(page),
    isSuperAdmin ? getPendingReviewCount() : Promise.resolve(0),
  ])

  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      {/* Fixed header area */}
      <div className="shrink-0 border-b p-6 pb-4">
        <div className="flex items-start justify-between">
          <header>
            <hgroup>
              <h1 className="text-2xl font-bold">Alerts</h1>
              <p className="text-muted-foreground">
                Monitor high-risk submissions, hotspot detections, and scheduled
                summaries.
              </p>
            </hgroup>
          </header>
          {isSuperAdmin && (
            <Link href="/admin/alerts/review">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">Review Queue</span>
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    {pendingCount}
                  </Badge>
                )}
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Scrollable table area */}
      <div className="min-h-0 flex-1 overflow-auto">
        {alertList.length === 0 ? (
          <p className="p-6 text-muted-foreground">No alerts yet.</p>
        ) : (
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[70px]">Risk</TableHead>
                <TableHead className="w-[260px]">Title</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[100px]">Created</TableHead>
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
                      {alert.createdAt.toLocaleDateString("en-US")}
                    </time>
                  </TableCell>
                  <TableCell>
                    <AlertActions
                      alertId={alert.id}
                      status={alert.status}
                      submissionId={extractSubmissionId(alert.message)}
                      adminNote={alert.adminNote ?? null}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        basePath="/admin/alerts"
      />
    </div>
  )
}
