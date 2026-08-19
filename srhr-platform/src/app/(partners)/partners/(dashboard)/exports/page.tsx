"use client"

import { useState } from "react"
import { toast } from "sonner"
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

export default function PartnersExportsPage() {
  // IRIX export filters
  const [irixDiseaseGroup, setIrixDiseaseGroup] = useState("all")
  const [irixRiskLevel, setIrixRiskLevel] = useState("all")
  const [irixDateFrom, setIrixDateFrom] = useState("")
  const [irixDateTo, setIrixDateTo] = useState("")
  const [irixExporting, setIrixExporting] = useState(false)

  // High-risk records export filters
  const [hrDiseaseGroup, setHrDiseaseGroup] = useState("all")
  const [hrSex, setHrSex] = useState("all")
  const [hrAgeGroup, setHrAgeGroup] = useState("all")
  const [hrLocation, setHrLocation] = useState("")
  const [hrRiskLevel, setHrRiskLevel] = useState("high")
  const [hrDateFrom, setHrDateFrom] = useState("")
  const [hrDateTo, setHrDateTo] = useState("")
  const [hrExporting, setHrExporting] = useState(false)

  async function handleExportIrix() {
    setIrixExporting(true)
    try {
      const params = new URLSearchParams()
      if (irixDiseaseGroup !== "all") params.set("diseaseGroup", irixDiseaseGroup)
      if (irixRiskLevel !== "all") params.set("riskLevel", irixRiskLevel)
      if (irixDateFrom) params.set("dateFrom", irixDateFrom)
      if (irixDateTo) params.set("dateTo", irixDateTo)

      const res = await fetch(`/api/partners/dashboard?${params}`)
      if (!res.ok) {
        toast.error("Failed to fetch data. Please try again.")
        return
      }

      const data = await res.json()
      const cleanData = (Array.isArray(data.areas) ? data.areas : []).map(
        (row: Record<string, unknown>) => ({
          location: row.location_name,
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

      if (cleanData.length === 0) {
        toast.error("No data found matching your filters.")
        return
      }

      downloadCsv(cleanData, `irix-export-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`Exported ${cleanData.length} location records`)
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setIrixExporting(false)
    }
  }

  async function handleExportHighRisk() {
    setHrExporting(true)
    try {
      const params = new URLSearchParams()
      if (hrDiseaseGroup !== "all") params.set("diseaseGroup", hrDiseaseGroup)
      if (hrSex !== "all") params.set("sex", hrSex)
      if (hrAgeGroup !== "all") params.set("ageGroup", hrAgeGroup)
      if (hrLocation.trim()) params.set("location", hrLocation.trim())
      if (hrRiskLevel !== "all") params.set("riskLevel", hrRiskLevel)
      if (hrDateFrom) params.set("dateFrom", hrDateFrom)
      if (hrDateTo) params.set("dateTo", hrDateTo)

      const res = await fetch(`/api/partners/export/high-risk?${params}`)
      if (!res.ok) {
        toast.error("Failed to fetch data. Please try again.")
        return
      }

      const data = await res.json()
      const records: Record<string, unknown>[] = data.records ?? []

      if (records.length === 0) {
        toast.error("No records found matching your filters.")
        return
      }

      downloadCsv(records, `high-risk-records-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success(`Exported ${records.length} records`)
    } catch {
      toast.error("Export failed. Please try again.")
    } finally {
      setHrExporting(false)
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Data Exports</h1>
          <p className="text-muted-foreground">
            Export de-identified risk data. All exports contain no personally
            identifiable information.
          </p>
        </hgroup>
      </header>

      {/* High-Risk Records Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export High-Risk Records</CardTitle>
          <CardDescription>
            Download de-identified individual assessment records filtered by risk
            category, demographics, location, and date. No PII included.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Disease Group</Label>
              <Select value={hrDiseaseGroup} onValueChange={setHrDiseaseGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="sti">Infection Risk</SelectItem>
                  <SelectItem value="maternal_health">Maternal Health</SelectItem>
                  <SelectItem value="community_wellbeing">Community Well-being</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Risk Level</Label>
              <Select value={hrRiskLevel} onValueChange={setHrRiskLevel}>
                <SelectTrigger className="w-full">
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
              <Label>Sex</Label>
              <Select value={hrSex} onValueChange={setHrSex}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sexes</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Age Group</Label>
              <Select value={hrAgeGroup} onValueChange={setHrAgeGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ages</SelectItem>
                  <SelectItem value="15_24">15–24</SelectItem>
                  <SelectItem value="25_34">25–34</SelectItem>
                  <SelectItem value="35_plus">35+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Location (community name)</Label>
              <Input
                type="text"
                placeholder="e.g. Karu"
                value={hrLocation}
                onChange={(e) => setHrLocation(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <Label>From</Label>
              <Input
                type="date"
                value={hrDateFrom}
                onChange={(e) => setHrDateFrom(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <Label>To</Label>
              <Input
                type="date"
                value={hrDateTo}
                onChange={(e) => setHrDateTo(e.target.value)}
                className="w-full"
              />
            </div>
          </fieldset>

          <footer className="flex items-center gap-3">
            <Button onClick={handleExportHighRisk} disabled={hrExporting}>
              {hrExporting ? "Exporting..." : "Export High-Risk Records CSV"}
            </Button>
            <Badge variant="outline">De-identified · No PII</Badge>
          </footer>
        </CardContent>
      </Card>

      {/* IRIX Scores Export (unchanged) */}
      <Card>
        <CardHeader>
          <CardTitle>Export IRIX Scores</CardTitle>
          <CardDescription>
            Download community-level aggregated risk scores as CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label>Disease Group</Label>
              <Select value={irixDiseaseGroup} onValueChange={setIrixDiseaseGroup}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="sti">Infection Risk</SelectItem>
                  <SelectItem value="maternal_health">Maternal Health</SelectItem>
                  <SelectItem value="community_wellbeing">Community Well-being</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Risk Level</Label>
              <Select value={irixRiskLevel} onValueChange={setIrixRiskLevel}>
                <SelectTrigger className="w-full">
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
                value={irixDateFrom}
                onChange={(e) => setIrixDateFrom(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <Label>To</Label>
              <Input
                type="date"
                value={irixDateTo}
                onChange={(e) => setIrixDateTo(e.target.value)}
                className="w-full"
              />
            </div>
          </fieldset>

          <footer className="flex items-center gap-3">
            <Button onClick={handleExportIrix} disabled={irixExporting}>
              {irixExporting ? "Exporting..." : "Export IRIX CSV"}
            </Button>
            <Badge variant="outline">Aggregated · De-identified</Badge>
          </footer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>All exports contain zero personally identifiable information</li>
            <li>High-risk record exports include only anonymised risk scores, age group, sex, and location</li>
            <li>IRIX exports are aggregated at community level — no individual records</li>
            <li>All export actions are logged in the audit trail</li>
          </ul>
        </CardContent>
      </Card>
    </section>
  )
}
