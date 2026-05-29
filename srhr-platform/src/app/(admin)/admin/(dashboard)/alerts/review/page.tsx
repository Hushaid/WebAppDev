export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { alerts, users } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ReviewActions } from "./review-actions"
import Link from "next/link"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

function extractSubmissionId(message: string | null): string | null {
  if (!message) return null
  const match = message.match(/Submission ID:\s*([0-9a-f-]+)/)
  return match?.[1] ?? null
}

export default async function AlertReviewPage() {
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role
  if (callerRole !== "super_admin") redirect("/admin/alerts")

  const pendingAlerts = await db
    .select({
      id: alerts.id,
      type: alerts.type,
      riskLevel: alerts.riskLevel,
      title: alerts.title,
      message: alerts.message,
      createdAt: alerts.createdAt,
      recipientName: users.name,
    })
    .from(alerts)
    .leftJoin(users, eq(alerts.recipientId, users.id))
    .where(eq(alerts.status, "pending_review"))
    .orderBy(desc(alerts.createdAt))

  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      <div className="shrink-0 border-b p-6 pb-4">
        <div className="flex items-center justify-between">
          <hgroup>
            <h1 className="text-2xl font-bold">Alert Review Queue</h1>
            <p className="text-muted-foreground">
              Review high-risk alerts before they are dispatched to partners and admins.
            </p>
          </hgroup>
          <Link href="/admin/alerts" className="text-sm text-muted-foreground hover:underline">
            ← All alerts
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {pendingAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center">
            <p className="text-sm font-medium text-muted-foreground">No alerts pending review</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              High-risk submissions will appear here for review before notification.
            </p>
          </div>
        ) : (
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Risk</TableHead>
                <TableHead className="w-[260px]">Alert</TableHead>
                <TableHead className="w-[100px]">Received</TableHead>
                <TableHead className="w-[280px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <Badge variant={alert.riskLevel === "high" ? "destructive" : "secondary"}>
                      {alert.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal break-words">
                    <p className="font-medium">{alert.title}</p>
                    {alert.message && (
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-0.5">
                        {alert.message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <time dateTime={alert.createdAt.toISOString()} className="text-sm">
                      {alert.createdAt.toLocaleDateString("en-US")}
                    </time>
                  </TableCell>
                  <TableCell>
                    <ReviewActions
                      alertId={alert.id}
                      submissionId={extractSubmissionId(alert.message)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
