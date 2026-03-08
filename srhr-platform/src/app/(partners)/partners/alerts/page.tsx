"use client"

import { useEffect, useState } from "react"
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

interface Alert {
  id: string
  type: string
  risk_level: string
  status: string
  title: string
  message: string | null
  created_at: string
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

function riskBadge(level: string) {
  const variants: Record<string, "destructive" | "secondary" | "default"> = {
    high: "destructive",
    medium: "secondary",
    low: "default",
  }
  return <Badge variant={variants[level] ?? "default"}>{level}</Badge>
}

export default function PartnersAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch("/api/alerts")
        if (res.ok) {
          setAlerts(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const pendingCount = alerts.filter((a) => a.status === "pending").length
  const highRiskCount = alerts.filter((a) => a.risk_level === "high").length

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">
            Risk alerts and notifications for your coverage areas.
          </p>
        </hgroup>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{alerts.length}</p>
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

      {loading ? (
        <p className="text-muted-foreground">Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p className="text-muted-foreground">No alerts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>{typeBadge(alert.type)}</TableCell>
                <TableCell>{riskBadge(alert.risk_level)}</TableCell>
                <TableCell>
                  <p className="font-medium">{alert.title}</p>
                  {alert.message && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {alert.message}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{alert.status}</Badge>
                </TableCell>
                <TableCell>
                  <time
                    dateTime={alert.created_at}
                    className="text-sm"
                  >
                    {new Date(alert.created_at).toLocaleDateString()}
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
