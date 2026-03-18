"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { MapPin } from "lucide-react"

function StatValue({
  value,
  className,
  showSkeleton,
}: {
  value: number
  className?: string
  showSkeleton: boolean
}) {
  if (showSkeleton) return <Skeleton className="h-9 w-16" />
  return <p className={`text-3xl font-bold ${className ?? ""}`}>{value}</p>
}

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
  computed_at?: string | null
}

export default function PartnersDashboardPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? ""
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [selectedCell, setSelectedCell] = useState<MapScore | null>(null)
  const [climateVisible, setClimateVisible] = useState(false)

  // Real-time IRIX scores via Electric SQL
  const { data: irixRows, isLoading, isError } = useElectricShape<IrixScoreRow>(
    "irix_scores",
  )

  // Timeout: if still loading after 8s, treat as unavailable
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => setTimedOut(true), 8000)
    return () => {
      clearTimeout(timer)
      setTimedOut(false)
    }
  }, [isLoading])

  const dataUnavailable = isError || (isLoading && timedOut)
  const showSkeleton = isLoading && !timedOut
  const hasData = !isLoading && !isError && irixRows.length > 0

  // Transform Electric SQL rows to map-compatible scores
  const scores: MapScore[] = irixRows.map((row) => {
    const h3Index = (row.geographic_unit_id as string) ?? ""
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
      computed_at: (row.computed_at as string) ?? null,
    }
  })

  // Apply client-side filters
  const filteredScores = scores.filter((s) => {
    if (filters.riskLevel !== "all" && s.overall_risk_level !== filters.riskLevel) {
      return false
    }
    if (filters.diseaseGroup !== "all") {
      if (filters.diseaseGroup === "sti" && !s.sti_avg_score) return false
      if (filters.diseaseGroup === "maternal_health" && !s.maternal_avg_score) return false
      if (filters.diseaseGroup === "community_wellbeing" && !s.community_wellbeing_avg_score) return false
    }
    if (filters.dateFrom && s.computed_at && s.computed_at < filters.dateFrom) return false
    if (filters.dateTo && s.computed_at && s.computed_at > filters.dateTo + "T23:59:59") return false
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
          <h1 className="text-2xl font-bold">
            {userName ? `Welcome, ${userName}` : "Partners Dashboard"}
          </h1>
          <p className="text-muted-foreground">
            Community-level health risk data and analytics. All data is aggregated and de-identified — no personal information is shown.
          </p>
        </hgroup>
      </header>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monitored Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={totalCells} showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hotspots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={hotspotCount} className="text-red-600" showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={highRiskCount} showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={totalSubmissions} showSkeleton={showSkeleton} />
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
        {showSkeleton ? (
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-[460px] w-full rounded-md" />
          </div>
        ) : dataUnavailable ? (
          <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border border-dashed">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              Unable to load community risk data
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              The real-time data service is currently unavailable. Please try again later.
            </p>
          </div>
        ) : !hasData ? (
          <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border border-dashed">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              No community risk data yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              IRIX scores will appear here once enough questionnaire submissions have been processed.
            </p>
          </div>
        ) : filteredScores.length === 0 ? (
          <div className="flex h-[500px] flex-col items-center justify-center rounded-lg border border-dashed">
            <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">
              No results match your filters
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Try adjusting the filters above to see community risk data.
            </p>
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
