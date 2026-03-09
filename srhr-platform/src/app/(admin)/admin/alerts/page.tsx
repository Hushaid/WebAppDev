export const dynamic = "force-dynamic"

import { getAlerts } from "./actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

export default async function AlertsPage() {
  const alertList = await getAlerts()

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">
            Monitor high-risk submissions, hotspot detections, and scheduled
            summaries.
          </p>
        </hgroup>
      </header>

      {alertList.length === 0 ? (
        <p className="text-muted-foreground">No alerts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alertList.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>{typeBadge(alert.type)}</TableCell>
                <TableCell>{riskBadge(alert.riskLevel)}</TableCell>
                <TableCell>
                  <p className="font-medium">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {alert.recipientName ? (
                    <span className="text-sm">
                      {alert.recipientName}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {alert.recipientEmail}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
