"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Upload, RefreshCw, CheckCircle2, XCircle, Loader2, FileText } from "lucide-react"

const dataSources = [
  {
    name: "NIMET (Karu)",
    type: "Rainfall + ET",
    resolution: "Ground station",
    frequency: "Client-provided",
    coverage: "Karu LGA, Nasarawa",
    status: "active",
    description: "Daily rainfall and evapotranspiration from NIMET — uploaded manually by admin",
  },
  {
    name: "Open-Meteo",
    type: "Weather Forecast",
    resolution: "~9km grid",
    frequency: "Daily (auto)",
    coverage: "Karu LGA",
    status: "active",
    description: "Live daily rainfall + ET for auto-updating predictions (no key required)",
  },
  {
    name: "FloodScan",
    type: "Flood History",
    resolution: "LGA-level",
    frequency: "Static (1998–2023)",
    coverage: "761 Nigerian LGAs",
    status: "active",
    description: "Satellite-derived flood fraction baselines used as model training labels",
  },
  {
    name: "Copernicus GLO-30",
    type: "Terrain (DEM)",
    resolution: "30m",
    frequency: "Static",
    coverage: "Karu LGA",
    status: "active",
    description: "Digital elevation model — HAND, TWI, slope computed for Karu terrain features",
  },
  {
    name: "ERA5",
    type: "Soil Moisture",
    resolution: "0.25° (~28km)",
    frequency: "Daily",
    coverage: "Nigeria",
    status: "active",
    description: "ECMWF Reanalysis v5 — soil moisture layers 1-4",
  },
  {
    name: "GloFAS",
    type: "River Discharge",
    resolution: "Station-based",
    frequency: "Daily forecast",
    coverage: "Benue/Niger basins",
    status: "active",
    description: "Global Flood Awareness System — river discharge forecasts",
  },
  {
    name: "WorldPop",
    type: "Population",
    resolution: "100m",
    frequency: "Annual",
    coverage: "Nigeria",
    status: "planned",
    description: "Population density estimates for exposure modelling",
  },
]

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  planned: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
}

type TrainStatus = "idle" | "uploading" | "training" | "success" | "error"

// ── Plain-English model result card ─────────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  rain_7d:              "7-day cumulative rainfall",
  rain_3d:              "3-day cumulative rainfall",
  rain_1d:              "Yesterday's rainfall",
  rain_14d:             "14-day cumulative rainfall",
  rain_30d:             "30-day cumulative rainfall",
  rain_7d_ratio:        "Recent vs monthly rainfall ratio",
  rain_3d_ratio:        "3-day vs monthly rainfall ratio",
  soil_moisture:        "Soil saturation level",
  water_balance_7d:     "7-day water balance (rain minus evaporation)",
  water_balance_30d:    "30-day water balance (rain minus evaporation)",
  hand_mean:            "Average height above nearest river",
  hand_min:             "Lowest point above nearest river",
  flood_fraction_baseline: "Historical flood frequency",
  benue_discharge_max:  "Benue River flow rate",
  niger_discharge_max:  "Niger River flow rate",
  forecast_risk:        "Upcoming rainfall forecast",
}

function modelQuality(auc: number): { label: string; color: string; description: string } {
  if (auc >= 0.80) return { label: "Excellent", color: "text-green-700", description: "The model is highly reliable for flood risk predictions." }
  if (auc >= 0.70) return { label: "Good", color: "text-green-600", description: "The model performs well and predictions can be trusted." }
  if (auc >= 0.60) return { label: "Moderate", color: "text-yellow-600", description: "The model is reasonably accurate. More historical data will improve it." }
  return { label: "Needs improvement", color: "text-orange-600", description: "The model may benefit from more training data. Contact support." }
}

function ModelResultCard({ metrics }: { metrics: Record<string, unknown> }) {
  const auc = typeof metrics.cv_auc_mean === "number" ? metrics.cv_auc_mean : null
  const quality = auc !== null ? modelQuality(auc) : null
  const topFeatureKey = typeof metrics.top_feature === "string" ? metrics.top_feature : null
  const topFeature = topFeatureKey ? (FEATURE_LABELS[topFeatureKey] ?? topFeatureKey) : null
  const nSamples = typeof metrics.n_samples === "number" ? metrics.n_samples : null
  const floodRate = typeof metrics.flood_event_rate_pct === "number" ? metrics.flood_event_rate_pct : null

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-4 space-y-4">
      {/* Headline */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">Flood prediction model updated successfully</p>
          <p className="text-xs text-green-700 mt-0.5">
            The system is now using the latest NIMET data. Predictions on the partners dashboard will reflect the new model immediately.
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quality && (
          <div className="rounded-md bg-white/80 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Prediction accuracy</p>
            <p className={`text-base font-bold ${quality.color}`}>{quality.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{quality.description}</p>
          </div>
        )}
        {topFeature && (
          <div className="rounded-md bg-white/80 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Strongest flood signal</p>
            <p className="text-sm font-semibold">{topFeature}</p>
            <p className="text-xs text-muted-foreground mt-0.5">This is the most important factor driving flood risk predictions.</p>
          </div>
        )}
        {nSamples !== null && (
          <div className="rounded-md bg-white/80 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Data used for training</p>
            <p className="text-sm font-semibold">{nSamples.toLocaleString()} daily records</p>
            <p className="text-xs text-muted-foreground mt-0.5">Across all Nigerian LGAs and historical years.</p>
          </div>
        )}
        {floodRate !== null && (
          <div className="rounded-md bg-white/80 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Flood events in training data</p>
            <p className="text-sm font-semibold">{floodRate.toFixed(1)}% of days had flooding</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reflects the rarity of flood events — model is calibrated for this.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DataSourcesPage() {
  const activeCount = dataSources.filter((d) => d.status === "active").length

  const rainfallRef = useRef<HTMLInputElement>(null)
  const etRef = useRef<HTMLInputElement>(null)
  const [rainfallFile, setRainfallFile] = useState<File | null>(null)
  const [etFile, setEtFile] = useState<File | null>(null)
  const [status, setStatus] = useState<TrainStatus>("idle")
  const [resultMessage, setResultMessage] = useState("")
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null)

  async function handleRetrain() {
    if (!rainfallFile && !etFile) return

    setStatus("uploading")
    setResultMessage("")
    setMetrics(null)

    const form = new FormData()
    if (rainfallFile) form.append("rainfall_file", rainfallFile)
    if (etFile) form.append("et_file", etFile)

    try {
      setStatus("training")
      const res = await fetch("/api/admin/climate-retrain", {
        method: "POST",
        body: form,
      })
      const data = await res.json()

      if (data.status === "ok") {
        setStatus("success")
        setResultMessage("")
        setMetrics(data.metrics ?? null)
        setRainfallFile(null)
        setEtFile(null)
        if (rainfallRef.current) rainfallRef.current.value = ""
        if (etRef.current) etRef.current.value = ""
      } else {
        setStatus("error")
        setResultMessage(data.message || data.error || "Training failed")
      }
    } catch {
      setStatus("error")
      setResultMessage("Could not reach the climate service.")
    }
  }

  const isTraining = status === "uploading" || status === "training"
  const canRetrain = (rainfallFile || etFile) && !isTraining

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Data Sources</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Climate and environmental datasets powering the flood risk model.
        </p>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{dataSources.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{dataSources.length - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* NIMET Upload + Retrain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload NIMET Data & Retrain Model</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload the latest daily rainfall and/or ET CSV files received from NIMET (Karu LGA).
            The model will retrain automatically after upload — this takes 2–5 minutes.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Rainfall upload */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
              onClick={() => rainfallRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {rainfallFile ? rainfallFile.name : "Rainfall CSV"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rainfallFile
                  ? `${(rainfallFile.size / 1024).toFixed(0)} KB`
                  : "dataset-rainfall.csv from NIMET"}
              </p>
              <input
                ref={rainfallRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setRainfallFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* ET upload */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
              onClick={() => etRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {etFile ? etFile.name : "Evapotranspiration CSV"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {etFile
                  ? `${(etFile.size / 1024).toFixed(0)} KB`
                  : "ET_dataset.csv from NIMET"}
              </p>
              <input
                ref={etRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setEtFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <Button
            onClick={handleRetrain}
            disabled={!canRetrain}
            className="w-full sm:w-auto"
          >
            {isTraining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === "uploading" ? "Uploading..." : "Retraining model..."}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Upload & Retrain Model
              </>
            )}
          </Button>

          {/* Result feedback */}
          {status === "success" && metrics && (
            <ModelResultCard metrics={metrics} />
          )}

          {status === "error" && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{resultMessage}</p>
            </div>
          )}

          {isTraining && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Retraining in progress</p>
                <p className="text-xs text-muted-foreground">
                  This takes 2–5 minutes. Do not close this page.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data sources table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataSources.map((ds) => (
                <TableRow key={ds.name}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      <p className="text-xs text-muted-foreground">{ds.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>{ds.type}</TableCell>
                  <TableCell className="text-xs">{ds.resolution}</TableCell>
                  <TableCell>{ds.frequency}</TableCell>
                  <TableCell>{ds.coverage}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[ds.status] || ""}>{ds.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
