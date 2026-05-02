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

const LGA_DISPLAY: Record<string, string> = {
  nasarawa_karu: "Karu, Nasarawa",
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

  // Only Karu LGA has real NIMET data — filter regardless of what the API returns
  const karuPredictions = predictions.filter((p) => p.lga_id === "nasarawa_karu")

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Flood Risk Layer
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
          ) : karuPredictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No flood predictions available. Service may be offline.
            </p>
          ) : (
            <div className="space-y-3">
              {karuPredictions.map((p) => (
                <div
                  key={p.lga_id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {LGA_DISPLAY[p.lga_id] ?? p.lga_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.prediction_date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {(p.flood_probability * 100).toFixed(1)}%
                    </span>
                    <Badge className={RISK_COLORS[p.risk_level] ?? ""}>
                      {p.risk_level}
                    </Badge>
                    {p.compound_risk_level && (
                      <Badge variant="outline" className="text-xs">
                        Compound: {p.compound_risk_level}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
