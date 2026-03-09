"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  // H3 cell center coordinates are derived from the H3 index
  const scores: MapScore[] = irixRows.map((row) => {
    const h3Index = (row.geographic_unit_id as string) ?? ""
    // Latitude and longitude should be stored alongside IRIX scores.
    // Fall back to row-level lat/lng if available, otherwise use H3 cell center
    // from geographic_units join. Default to Nigeria centroid if unavailable.
    const lat = row.lat ? parseFloat(row.lat as string) : 9.06
    const lng = row.lng ? parseFloat(row.lng as string) : 7.49
    return {
      h3_index: h3Index,
      lat,
      lng,
      overall_irix_score: parseFloat(row.overall_irix_score as string),
      overall_risk_level: row.overall_risk_level as string,
      sti_avg_score: row.sti_avg_score ? parseFloat(row.sti_avg_score as string) : null,
      maternal_avg_score: row.maternal_avg_score ? parseFloat(row.maternal_avg_score as string) : null,
      community_wellbeing_avg_score: row.community_wellbeing_avg_score
        ? parseFloat(row.community_wellbeing_avg_score as string)
        : null,
      submission_count: row.submission_count as number,
      hotspot_flag: row.hotspot_flag as boolean,
    }
  })

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

  // Trend data fetched from API
  const [trendData, setTrendData] = useState<
    { period: string; sti_avg: number; maternal_avg: number; community_avg: number; overall: number; submissions: number }[]
  >([])

  useEffect(() => {
    let cancelled = false
    async function fetchTrends() {
      try {
        const res = await fetch("/api/irix?path=/api/v1/scores?hotspots_only=false&limit=100")
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (cancelled) return
        if (Array.isArray(data)) {
          type TrendGroup = { sti: number[]; maternal: number[]; community: number[]; overall: number[]; count: number }
          const grouped: Record<string, TrendGroup> = {}
          for (const item of data as Record<string, unknown>[]) {
            const period = (item.computed_at as string)?.slice(0, 10) ?? "unknown"
            if (!grouped[period]) grouped[period] = { sti: [], maternal: [], community: [], overall: [], count: 0 }
            if (item.sti_avg_score) grouped[period].sti.push(item.sti_avg_score as number)
            if (item.maternal_avg_score) grouped[period].maternal.push(item.maternal_avg_score as number)
            if (item.community_wellbeing_avg_score) grouped[period].community.push(item.community_wellbeing_avg_score as number)
            grouped[period].overall.push(item.overall_irix_score as number)
            grouped[period].count += (item.submission_count as number) ?? 0
          }
          const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
          setTrendData(
            (Object.entries(grouped) as [string, TrendGroup][]).slice(-4).map(([period, g]) => ({
              period,
              sti_avg: avg(g.sti),
              maternal_avg: avg(g.maternal),
              community_avg: avg(g.community),
              overall: avg(g.overall),
              submissions: g.count,
            }))
          )
        }
      } catch {
        // Trend data is supplementary — don't block on failure
      }
    }
    fetchTrends()
    return () => { cancelled = true }
  }, [])

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
