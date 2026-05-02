"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, CheckCircle, CloudRain, Waves } from "lucide-react"

interface FloodPrediction {
  lga_id: string
  prediction_date: string
  flood_probability: number
  risk_level: string
  compound_score: number | null
  compound_risk_level: string | null
}

interface ClimateLayerProps {
  visible: boolean
  onToggle: (visible: boolean) => void
}

const RISK_CONFIG: Record<string, {
  icon: React.ReactNode
  color: string
  border: string
  headline: string
  description: string
  action: string
}> = {
  normal: {
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    color: "text-green-700",
    border: "border-green-200 bg-green-50",
    headline: "No significant flood risk",
    description: "Rainfall and soil conditions are within normal seasonal range. No flood disruption expected.",
    action: "No action needed. Continue routine programme activities.",
  },
  watch: {
    icon: <CloudRain className="h-5 w-5 text-yellow-600" />,
    color: "text-yellow-700",
    border: "border-yellow-200 bg-yellow-50",
    headline: "Flood conditions developing",
    description: "Rainfall is building up and soil is becoming saturated. Flooding is possible in low-lying areas over the next few days.",
    action: "Review your emergency response plan. Ensure community contacts in Karu are reachable and aware of the developing situation.",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
    color: "text-orange-700",
    border: "border-orange-200 bg-orange-50",
    headline: "Elevated flood risk",
    description: "High rainfall accumulation detected. Flooding is likely in low-lying and riverside areas.",
    action: "Alert your community focal points in Karu. Pre-position supplies and resources. Notify partner organisations and relevant government agencies.",
  },
  emergency: {
    icon: <Waves className="h-5 w-5 text-red-600" />,
    color: "text-red-700",
    border: "border-red-200 bg-red-50",
    headline: "Critical flood risk",
    description: "Extreme rainfall and saturated soils indicate a high probability of severe flooding.",
    action: "Activate your emergency response plan immediately. Coordinate with local government and relief agencies. Prioritise communication with vulnerable beneficiaries in affected areas.",
  },
}

const COMPOUND_LABELS: Record<string, string> = {
  low: "Low health impact risk",
  moderate: "Moderate health impact risk",
  high: "High health impact risk — flood-related disease likely",
  critical: "Critical health impact — immediate response needed",
}

export function ClimateLayer({ visible, onToggle }: ClimateLayerProps) {
  const [predictions, setPredictions] = useState<FloodPrediction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!visible) return

    async function fetchFloodRisk() {
      setLoading(true)
      try {
        const res = await fetch("/api/climate?path=/api/v1/flood-risk")
        if (res.ok) {
          const data = await res.json()
          setPredictions(data.predictions || [])
        }
      } catch {
        // Service may not be running
      } finally {
        setLoading(false)
      }
    }

    fetchFloodRisk()
  }, [visible])

  const karu = predictions.find((p) => p.lga_id === "nasarawa_karu")
  const config = RISK_CONFIG[karu?.risk_level ?? "normal"]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Flood Risk Layer</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="climate-toggle" className="text-xs">
              {visible ? "On" : "Off"}
            </Label>
            <Switch
              id="climate-toggle"
              checked={visible}
              onCheckedChange={onToggle}
            />
          </div>
        </div>
      </CardHeader>

      {visible && (
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading flood conditions...</p>
          ) : !karu ? (
            <p className="text-sm text-muted-foreground">
              Flood data unavailable. Service may be offline.
            </p>
          ) : (
            <div className={`rounded-lg border p-4 space-y-3 ${config.border}`}>
              {/* Location + date */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Karu LGA, Nasarawa · {karu.prediction_date}
                </p>
                <p className="text-xs text-muted-foreground">
                  Model confidence: {(karu.flood_probability * 100).toFixed(0)}%
                </p>
              </div>

              {/* Status headline */}
              <div className="flex items-center gap-2">
                {config.icon}
                <p className={`font-semibold ${config.color}`}>{config.headline}</p>
              </div>

              {/* Plain-English description */}
              <p className="text-sm text-gray-700">{config.description}</p>

              {/* What to do */}
              <div className="rounded-md bg-white/60 px-3 py-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
                  Recommended action
                </p>
                <p className="text-sm text-gray-800">{config.action}</p>
              </div>

              {/* Health impact line */}
              {karu.compound_risk_level && (
                <p className="text-xs text-muted-foreground">
                  {COMPOUND_LABELS[karu.compound_risk_level] ?? `Health impact: ${karu.compound_risk_level}`}
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
