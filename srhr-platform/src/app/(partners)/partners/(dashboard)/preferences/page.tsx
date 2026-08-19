"use client"

import { useState, useEffect, useTransition } from "react"
import { toast } from "sonner"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AlertPreferences {
  highRiskAlerts: boolean
  hotspotAlerts: boolean
  climateAlerts: boolean
  weeklyDigest: boolean
  monthlyReport: boolean
  minimumRiskLevel: string
}

export default function PartnerPreferencesPage() {
  const [prefs, setPrefs] = useState<AlertPreferences>({
    highRiskAlerts: true,
    hotspotAlerts: true,
    climateAlerts: true,
    weeklyDigest: true,
    monthlyReport: true,
    minimumRiskLevel: "medium",
  })
  const [isPending, startTransition] = useTransition()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function loadPrefs() {
      try {
        const res = await fetch("/api/partner-preferences")
        if (res.ok) {
          const data = await res.json()
          setPrefs(data)
        }
      } finally {
        setLoaded(true)
      }
    }
    loadPrefs()
  }, [])

  function updatePref<K extends keyof AlertPreferences>(
    key: K,
    value: AlertPreferences[K],
  ) {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await fetch("/api/partner-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      }).then((response) => response.json())
      if (result.success) {
        toast.success("Preferences saved")
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!loaded) return null

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <hgroup>
          <h1 className="text-2xl font-bold">Alert Preferences</h1>
          <p className="text-muted-foreground">
            Configure which alerts you receive and how often.
          </p>
        </hgroup>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Real-time Alerts</CardTitle>
          <CardDescription>
            Receive immediate notifications when risk events occur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="high-risk">High-risk individual alerts</Label>
            <Switch
              id="high-risk"
              checked={prefs.highRiskAlerts}
              onCheckedChange={(v) => updatePref("highRiskAlerts", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hotspot">Hotspot detection alerts</Label>
            <Switch
              id="hotspot"
              checked={prefs.hotspotAlerts}
              onCheckedChange={(v) => updatePref("hotspotAlerts", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="climate">Climate / flood risk alerts</Label>
            <Switch
              id="climate"
              checked={prefs.climateAlerts}
              onCheckedChange={(v) => updatePref("climateAlerts", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Reports</CardTitle>
          <CardDescription>
            Periodic summaries delivered to your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="weekly">Weekly digest</Label>
            <Switch
              id="weekly"
              checked={prefs.weeklyDigest}
              onCheckedChange={(v) => updatePref("weeklyDigest", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="monthly">Monthly report</Label>
            <Switch
              id="monthly"
              checked={prefs.monthlyReport}
              onCheckedChange={(v) => updatePref("monthlyReport", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Threshold</CardTitle>
          <CardDescription>
            Minimum risk level to receive alerts for.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label htmlFor="min-risk">Minimum risk level</Label>
            <Select
              value={prefs.minimumRiskLevel}
              onValueChange={(v) => updatePref("minimumRiskLevel", v)}
            >
              <SelectTrigger className="w-[160px]" id="min-risk">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save preferences"}
        </Button>
      </div>

      <ChangePasswordForm />
    </section>
  )
}
