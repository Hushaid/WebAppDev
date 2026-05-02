"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle, Waves, CloudRain, Info } from "lucide-react"
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

// What each risk level means to a partner — no numbers
const RISK_LABEL: Record<string, string> = {
  normal:    "Safe",
  watch:     "Monitor",
  warning:   "Elevated",
  emergency: "Critical",
}

const RISK_ICON: Record<string, React.ReactNode> = {
  normal:    <CheckCircle2 className="h-4 w-4 text-green-600" />,
  watch:     <CloudRain className="h-4 w-4 text-yellow-500" />,
  warning:   <AlertTriangle className="h-4 w-4 text-orange-500" />,
  emergency: <Waves className="h-4 w-4 text-red-600" />,
}

const RISK_ROW_BG: Record<string, string> = {
  normal:    "",
  watch:     "bg-yellow-50",
  warning:   "bg-orange-50",
  emergency: "bg-red-50",
}

const RISK_LABEL_COLOR: Record<string, string> = {
  normal:    "text-green-700",
  watch:     "text-yellow-700",
  warning:   "text-orange-600",
  emergency: "text-red-700",
}

const CONFIDENCE_NOTE: Record<string, string> = {
  high:       "",
  moderate:   "",
  indicative: "trend only",
}

function SummaryBanner({ forecasts }: { forecasts: ForecastDay[] }) {
  const highDays = forecasts.filter(
    (f) => f.risk_level === "warning" || f.risk_level === "emergency"
  )
  const watchDays = forecasts.filter((f) => f.risk_level === "watch")

  if (highDays.length > 0) {
    const first = highDays[0]
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
        <p className="font-semibold text-orange-700">Elevated risk period ahead</p>
        <p className="text-orange-700 mt-0.5">
          Flood risk rises around <strong>{first.day_label}</strong>. Review your emergency response plan and ensure community contacts in Karu are reachable.
        </p>
      </div>
    )
  }

  if (watchDays.length > 0) {
    const first = watchDays[0]
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
        <p className="font-semibold text-yellow-700">Conditions to watch</p>
        <p className="text-yellow-700 mt-0.5">
          Rainfall is expected to build around <strong>{first.day_label}</strong>. No immediate action needed, but stay informed.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm">
      <p className="font-semibold text-green-700">All clear for the next 16 days</p>
      <p className="text-green-700 mt-0.5">
        No significant flood risk is forecast for Karu LGA. Continue routine programme activities.
      </p>
    </div>
  )
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
                <TooltipContent className="max-w-72 text-xs space-y-1">
                  <p className="font-medium">How to read this outlook</p>
                  <p>Each row shows the expected flood situation for that day based on rainfall forecasts and terrain data for Karu LGA.</p>
                  <p><strong>Safe</strong> — normal conditions, no action needed.</p>
                  <p><strong>Monitor</strong> — rainfall building, stay alert.</p>
                  <p><strong>Elevated</strong> — flooding likely, prepare response.</p>
                  <p><strong>Critical</strong> — activate emergency plan.</p>
                  <p className="text-muted-foreground pt-1">Days 1–3 are most reliable. Beyond day 5, treat as a general trend.</p>
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

      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading flood outlook...</p>
        ) : error || !data ? (
          <p className="text-sm text-muted-foreground">
            Flood outlook unavailable. Service may be offline.
          </p>
        ) : (
          <>
            <SummaryBanner forecasts={data.forecasts} />

            <div className="divide-y rounded-lg border overflow-hidden">
              {data.forecasts.map((f, i) => (
                <div
                  key={f.date}
                  className={`flex items-center gap-3 px-3 py-2.5 ${RISK_ROW_BG[f.risk_level]}`}
                >
                  {/* Day label */}
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium">{f.day_label}</p>
                    {f.confidence === "indicative" && (
                      <p className="text-xs text-muted-foreground">trend only</p>
                    )}
                  </div>

                  {/* Status icon + label */}
                  <div className="flex items-center gap-1.5 w-24 shrink-0">
                    {RISK_ICON[f.risk_level]}
                    <span className={`text-sm font-medium ${RISK_LABEL_COLOR[f.risk_level]}`}>
                      {RISK_LABEL[f.risk_level]}
                    </span>
                  </div>

                  {/* Rain indicator */}
                  <div className="flex-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {f.rain_mm > 0 && (
                      <>
                        <CloudRain className="h-3 w-3 text-blue-400 shrink-0" />
                        <span>{f.rain_mm}mm rain expected</span>
                      </>
                    )}
                  </div>

                  {/* Faint divider between reliable/indicative zones */}
                  {i === 2 && (
                    <span className="text-xs text-muted-foreground/50 shrink-0">· · ·</span>
                  )}
                </div>
              ))}
            </div>

            {/* Footer note */}
            <p className="text-xs text-muted-foreground">
              Forecast accuracy is highest for the next 3 days. Beyond day 5, use as a general trend indicator only.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
