"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CloudRain, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ForecastDay {
  date: string
  day_label: string
  flood_probability: number
  risk_level: string
  rain_mm: number
  confidence: string
  is_forecast: boolean
}

interface ForecastResponse {
  location: string
  forecasts: ForecastDay[]
  generated_at: string
}

const RISK_BAR: Record<string, string> = {
  normal:    "bg-green-500",
  watch:     "bg-yellow-400",
  warning:   "bg-orange-500",
  emergency: "bg-red-600",
}

const RISK_TEXT: Record<string, string> = {
  normal:    "text-green-700",
  watch:     "text-yellow-700",
  warning:   "text-orange-600",
  emergency: "text-red-700",
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high:        "Reliable",
  moderate:    "Good estimate",
  indicative:  "Indicative",
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high:       "text-green-600",
  moderate:   "text-yellow-600",
  indicative: "text-gray-400",
}

export function FloodForecast() {
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/climate?path=/api/v1/flood-forecast")
        if (res.ok) {
          setData(await res.json())
        } else {
          setError(true)
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">
              16-Day Flood Outlook — Karu LGA
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  <p className="font-medium mb-1">How to read this outlook</p>
                  <p>Each bar shows the likelihood of flooding on that day based on rainfall forecasts and terrain data.</p>
                  <p className="mt-1"><span className="font-medium">Reliable</span> = days 1–2, <span className="font-medium">Good estimate</span> = days 3–5, <span className="font-medium">Indicative</span> = days 6–16 (trend only).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {data && (
            <p className="text-xs text-muted-foreground">
              Updated {data.generated_at}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading flood outlook...</p>
        ) : error || !data ? (
          <p className="text-sm text-muted-foreground">
            Flood outlook unavailable. Service may be offline.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Peak risk callout if any warning+ day in the window */}
            {(() => {
              const highDays = data.forecasts.filter(
                (f) => f.risk_level === "warning" || f.risk_level === "emergency"
              )
              if (highDays.length === 0) return null
              const worst = highDays[0]
              return (
                <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                  <span className="font-medium text-orange-700">Heads up: </span>
                  <span className="text-orange-700">
                    Elevated flood risk expected around {worst.day_label}. Review your response plan.
                  </span>
                </div>
              )
            })()}

            {/* Day-by-day strip */}
            <div className="space-y-1.5">
              {data.forecasts.map((f) => (
                <div key={f.date} className="flex items-center gap-3">
                  {/* Day label */}
                  <div className="w-24 shrink-0">
                    <p className={`text-sm font-medium ${f.is_forecast ? "" : "text-muted-foreground"}`}>
                      {f.day_label}
                    </p>
                    <p className={`text-xs ${CONFIDENCE_COLOR[f.confidence]}`}>
                      {CONFIDENCE_LABEL[f.confidence]}
                    </p>
                  </div>

                  {/* Probability bar */}
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${RISK_BAR[f.risk_level]}`}
                      style={{ width: `${Math.max(f.flood_probability * 100, 3)}%` }}
                    />
                  </div>

                  {/* Probability % */}
                  <p className={`w-9 text-right text-xs font-semibold shrink-0 ${RISK_TEXT[f.risk_level]}`}>
                    {(f.flood_probability * 100).toFixed(0)}%
                  </p>

                  {/* Rain */}
                  {f.rain_mm > 0 && (
                    <div className="flex items-center gap-0.5 w-16 shrink-0">
                      <CloudRain className="h-3 w-3 text-blue-400" />
                      <span className="text-xs text-muted-foreground">{f.rain_mm}mm</span>
                    </div>
                  )}
                  {f.rain_mm === 0 && <div className="w-16 shrink-0" />}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-1 border-t text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" /> Normal</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400" /> Watch</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-500" /> Warning</span>
              <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-600" /> Emergency</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
