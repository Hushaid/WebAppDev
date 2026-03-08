"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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

const RISK_COLORS: Record<string, string> = {
  emergency: "bg-red-600 text-white",
  warning: "bg-orange-500 text-white",
  watch: "bg-yellow-500 text-black",
  normal: "bg-green-600 text-white",
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
        // Climate service may not be running
      } finally {
        setLoading(false)
      }
    }

    fetchFloodRisk()
  }, [visible])

  const emergencyCount = predictions.filter(
    (p) => p.risk_level === "emergency",
  ).length
  const warningCount = predictions.filter(
    (p) => p.risk_level === "warning",
  ).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Climate / Flood Risk Layer
          </CardTitle>
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
            <p className="text-sm text-muted-foreground">
              Loading flood predictions...
            </p>
          ) : predictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No flood predictions available. Climate service may be offline.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="destructive">{emergencyCount} Emergency</Badge>
                <Badge className="bg-orange-500">{warningCount} Warning</Badge>
                <Badge variant="secondary">
                  {predictions.length} Total LGAs
                </Badge>
              </div>

              {/* High-risk LGA list */}
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {predictions
                  .filter((p) =>
                    ["emergency", "warning"].includes(p.risk_level),
                  )
                  .slice(0, 10)
                  .map((p) => (
                    <li
                      key={p.lga_id}
                      className="flex items-center justify-between rounded px-2 py-1 text-sm"
                    >
                      <span className="font-medium">{p.lga_id}</span>
                      <span className="flex items-center gap-2">
                        <span>{(p.flood_probability * 100).toFixed(0)}%</span>
                        <Badge className={RISK_COLORS[p.risk_level] || ""}>
                          {p.risk_level}
                        </Badge>
                        {p.compound_risk_level && (
                          <Badge variant="outline" className="text-xs">
                            Compound: {p.compound_risk_level}
                          </Badge>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
