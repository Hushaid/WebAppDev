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
import { FloodForecast } from "@/components/partners/flood-forecast"
import { HistoryDatePicker } from "@/components/partners/history-date-picker"
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
  location_name: string
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
  const [climateVisible, setClimateVisible] = useState(true)
  const [irixHistoryDate, setIrixHistoryDate] = useState<string | null>(null)
  const [scores, setScores] = useState<MapScore[]>([])
  const [trendData, setTrendData] = useState<
    { period: string; sti_avg: number; maternal_avg: number | null; community_avg: number; overall: number; submissions: number }[]
  >([])
  const [locationOptions, setLocationOptions] = useState<string[]>([])
  const [summary, setSummary] = useState({
    monitoredAreas: 0,
    hotspots: 0,
    highRiskAreas: 0,
    totalSubmissions: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function fetchDashboardData() {
      setIsLoading(true)
      setIsError(false)

      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") params.set(key, value)
      })

      try {
        const response = await fetch(`/api/partners/dashboard?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Failed to load partner dashboard data")

        const payload = await response.json()
        setScores(payload.areas ?? [])
        setTrendData(payload.trend ?? [])
        setLocationOptions(payload.locationOptions ?? [])
        setSummary(payload.summary ?? {
          monitoredAreas: 0,
          hotspots: 0,
          highRiskAreas: 0,
          totalSubmissions: 0,
        })
      } catch (error) {
        if ((error as Error).name === "AbortError") return
        setIsError(true)
        setScores([])
        setTrendData([])
        setLocationOptions([])
        setSummary({ monitoredAreas: 0, hotspots: 0, highRiskAreas: 0, totalSubmissions: 0 })
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchDashboardData()
    return () => controller.abort()
  }, [filters])

  useEffect(() => {
    if (filters.location === "all") return
    if (locationOptions.includes(filters.location)) return
    setFilters((current) => ({ ...current, location: "all" }))
  }, [filters.location, locationOptions])

  // Sync irixHistoryDate into filters dateFrom/dateTo
  useEffect(() => {
    setFilters((current) => ({
      ...current,
      dateFrom: irixHistoryDate ?? "",
      dateTo: irixHistoryDate ?? "",
    }))
  }, [irixHistoryDate])

  const showSkeleton = isLoading
  const dataUnavailable = isError
  const hasData = scores.length > 0
  const hasActiveFilters = Object.values(filters).some((v) => v && v !== "all")

  return (
    <section className="space-y-6">
      {/* ── Header ── */}
      <header>
        <h1 className="text-2xl font-bold">
          {userName ? `Welcome, ${userName}` : "Partners Dashboard"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Community-level health risk data and analytics. All data is aggregated and de-identified.
        </p>
      </header>

      {/* ── Summary stats (always full width) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monitored Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={summary.monitoredAreas} showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hotspots</CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={summary.hotspots} className="text-red-600" showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={summary.highRiskAreas} showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <StatValue value={summary.totalSubmissions} showSkeleton={showSkeleton} />
          </CardContent>
        </Card>
      </div>

      {/* ── Main 2-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Left col (3/5): community health data */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <IrixFilters
              filters={filters}
              locationOptions={locationOptions}
              onChange={(f) => {
                setIrixHistoryDate(null)
                setFilters(f)
              }}
              onReset={() => {
                setIrixHistoryDate(null)
                setFilters(DEFAULT_FILTERS)
              }}
            />
            <div className="flex items-center gap-1 shrink-0">
              {irixHistoryDate && (
                <span className="text-xs text-muted-foreground mr-1">
                  IRIX snapshot · {irixHistoryDate}
                </span>
              )}
              <HistoryDatePicker value={irixHistoryDate} onChange={setIrixHistoryDate} />
            </div>
          </div>

          <div className="relative">
            {showSkeleton ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-[420px] w-full rounded-md" />
              </div>
            ) : dataUnavailable ? (
              <div className="flex h-[460px] flex-col items-center justify-center rounded-lg border border-dashed">
                <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">Unable to load community risk data</p>
                <p className="mt-1 text-xs text-muted-foreground/70">The real-time data service is currently unavailable.</p>
              </div>
            ) : !hasData ? (
              <div className="flex h-[460px] flex-col items-center justify-center rounded-lg border border-dashed">
                <MapPin className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  {hasActiveFilters ? "No results match your filters" : "No community risk data yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {hasActiveFilters
                    ? "Try adjusting the filters above."
                    : "IRIX scores will appear here once submissions have been processed."}
                </p>
              </div>
            ) : (
              <IrixMap scores={scores} onCellClick={setSelectedCell} />
            )}
            <CellDetail cell={selectedCell} onClose={() => setSelectedCell(null)} />
          </div>

          <IrixTrendChart data={trendData} />
        </div>

        {/* Right col (2/5): environmental risk context */}
        <div className="lg:col-span-2 space-y-4">
          <ClimateLayer visible={climateVisible} onToggle={setClimateVisible} />
          <FloodForecast />
        </div>

      </div>
    </section>
  )
}
