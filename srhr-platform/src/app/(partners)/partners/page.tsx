"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { IrixMap } from "@/components/partners/irix-map"
import {
  IrixFilters,
  DEFAULT_FILTERS,
  type FilterValues,
} from "@/components/partners/irix-filters"
import { IrixTrendChart } from "@/components/partners/irix-trend-chart"
import { CellDetail } from "@/components/partners/cell-detail"
import { ClimateLayer } from "@/components/partners/climate-layer"
import { useElectricShape } from "@/lib/electric/use-shape"
import type { IrixScoreRow } from "@/lib/electric/shapes"

interface MapScore {
  h3_index: string
  lat: number
  lng: number
  overall_irix_score: number
  overall_risk_level: string
  sti_avg_score: number | null
  maternal_avg_score: number | null
  community_wellbeing_avg_score: number | null
  submission_count: number
  hotspot_flag: boolean
}

export default function PartnersDashboardPage() {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [selectedCell, setSelectedCell] = useState<MapScore | null>(null)
  const [climateVisible, setClimateVisible] = useState(false)

  // Real-time IRIX scores via Electric SQL
  const { data: irixRows, isLoading } = useElectricShape<IrixScoreRow>(
    "irix_scores",
  )

  // Transform Electric SQL rows to map-compatible scores
  const scores: MapScore[] = irixRows.map((row) => ({
    h3_index: (row.geographic_unit_id as string) ?? "",
    // H3 cell center coordinates would come from the geographic_units table
    // For now approximate from the data
    lat: 9.0 + Math.random() * 0.5,
    lng: 7.5 + Math.random() * 0.5,
    overall_irix_score: parseFloat(row.overall_irix_score as string),
    overall_risk_level: row.overall_risk_level as string,
    sti_avg_score: row.sti_avg_score ? parseFloat(row.sti_avg_score as string) : null,
    maternal_avg_score: row.maternal_avg_score ? parseFloat(row.maternal_avg_score as string) : null,
    community_wellbeing_avg_score: row.community_wellbeing_avg_score
      ? parseFloat(row.community_wellbeing_avg_score as string)
      : null,
    submission_count: row.submission_count as number,
    hotspot_flag: row.hotspot_flag as boolean,
  }))

  // Apply client-side filters
  const filteredScores = scores.filter((s) => {
    if (filters.riskLevel !== "all" && s.overall_risk_level !== filters.riskLevel) {
      return false
    }
    return true
  })

  // Summary stats
  const totalCells = filteredScores.length
  const hotspotCount = filteredScores.filter((s) => s.hotspot_flag).length
  const highRiskCount = filteredScores.filter(
    (s) => s.overall_risk_level === "high",
  ).length
  const totalSubmissions = filteredScores.reduce(
    (sum, s) => sum + s.submission_count,
    0,
  )

  // Mock trend data (in production this comes from /api/irix?path=/api/v1/trends)
  const trendData = [
    { period: "W1", sti_avg: 5.2, maternal_avg: 7.1, community_avg: 3.4, overall: 15.7, submissions: 45 },
    { period: "W2", sti_avg: 5.8, maternal_avg: 6.9, community_avg: 3.6, overall: 16.3, submissions: 52 },
    { period: "W3", sti_avg: 6.1, maternal_avg: 7.3, community_avg: 3.2, overall: 16.6, submissions: 48 },
    { period: "W4", sti_avg: 5.5, maternal_avg: 7.5, community_avg: 3.8, overall: 16.8, submissions: 61 },
  ]

  return (
    <section className="space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Partners Dashboard</h1>
          <p className="text-muted-foreground">
            Community-level SRHR risk visualisation and analytics.
          </p>
        </hgroup>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Geographic Cells
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalCells}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hotspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{hotspotCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{highRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSubmissions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <IrixFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Map */}
      <div className="relative">
        {isLoading ? (
          <div className="flex h-[500px] items-center justify-center rounded-lg border">
            <p className="text-muted-foreground">Loading IRIX data...</p>
          </div>
        ) : (
          <IrixMap scores={filteredScores} onCellClick={setSelectedCell} />
        )}
        <CellDetail
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      </div>

      {/* Climate / Flood Risk Layer */}
      <ClimateLayer visible={climateVisible} onToggle={setClimateVisible} />

      {/* Trend charts */}
      <IrixTrendChart data={trendData} />
    </section>
  )
}
