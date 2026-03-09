"use client"

import { useState } from "react"
import Papa from "papaparse"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function PartnersExportsPage() {
  const [diseaseGroup, setDiseaseGroup] = useState("all")
  const [riskLevel, setRiskLevel] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [exporting, setExporting] = useState(false)

  async function handleExportCsv() {
    setExporting(true)
    try {
      // Fetch de-identified IRIX scores from API
      const params = new URLSearchParams({ path: "/api/v1/scores" })
      if (diseaseGroup !== "all") params.set("disease_group", diseaseGroup)
      if (riskLevel !== "all") params.set("risk_level", riskLevel)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)

      const res = await fetch(`/api/irix?${params}`)
      if (!res.ok) {
        // Fall back to empty set if IRIX service unavailable
        downloadCsv([], "irix-export.csv")
        return
      }

      const data = await res.json()

      // Strip any PII — only include aggregated, de-identified fields
      const cleanData = (Array.isArray(data) ? data : []).map(
        (row: Record<string, unknown>) => ({
          h3_index: row.h3_index,
          overall_irix_score: row.overall_irix_score,
          overall_risk_level: row.overall_risk_level,
          sti_avg_score: row.sti_avg_score,
          maternal_avg_score: row.maternal_avg_score,
          community_wellbeing_avg_score: row.community_wellbeing_avg_score,
          submission_count: row.submission_count,
          hotspot_flag: row.hotspot_flag,
          computed_at: row.computed_at,
        }),
      )

      downloadCsv(cleanData, `irix-export-${new Date().toISOString().slice(0, 10)}.csv`)
    } finally {
      setExporting(false)
    }
  }

  function downloadCsv(data: Record<string, unknown>[], filename: string) {
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Data Exports</h1>
          <p className="text-muted-foreground">
            Export de-identified IRIX risk data. All exports are aggregated at
            the geographic cell level — no individual or personally identifiable
            data is included.
          </p>
        </hgroup>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Export IRIX Scores</CardTitle>
          <CardDescription>
            Download community-level risk scores as CSV. Data is filtered and
            de-identified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Disease Group</Label>
              <Select value={diseaseGroup} onValueChange={setDiseaseGroup}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="sti">STI Risk</SelectItem>
                  <SelectItem value="maternal_health">Maternal Health</SelectItem>
                  <SelectItem value="community_wellbeing">Community Well-being</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Risk Level</Label>
              <Select value={riskLevel} onValueChange={setRiskLevel}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="space-y-1">
              <Label>To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </fieldset>

          <footer className="flex items-center gap-3">
            <Button onClick={handleExportCsv} disabled={exporting}>
              {exporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Badge variant="outline">De-identified data only</Badge>
          </footer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>All exports contain aggregated, community-level data only</li>
            <li>No individual submission data or PII is included</li>
            <li>Geographic resolution is H3 hexagonal cells (~5.16 km²)</li>
            <li>Minimum 3 submissions per cell required for inclusion</li>
            <li>All export actions are logged in the audit trail</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
