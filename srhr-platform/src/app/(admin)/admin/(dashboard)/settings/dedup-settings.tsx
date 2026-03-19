"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateDedupSettings } from "./actions"

interface DedupSettingsProps {
  initialRadius: number
  initialWindow: number
}

export function DedupSettings({ initialRadius, initialWindow }: DedupSettingsProps) {
  const [radius, setRadius] = useState(initialRadius)
  const [window, setWindow] = useState(initialWindow || 480)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateDedupSettings({
        radiusMeters: radius,
        windowMinutes: window,
      })
      if (result.success) {
        toast.success("Duplicate detection settings saved")
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicate Submission Detection</CardTitle>
        <CardDescription>
          When a field worker submits a questionnaire, the system checks for
          recent submissions from the same worker at a nearby location. If a
          match is found within the radius and time window below, the
          submission is rejected as a duplicate. This prevents accidental
          double-submissions during fieldwork.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dedup-radius">Proximity radius (meters)</Label>
            <Input
              id="dedup-radius"
              type="number"
              min={10}
              max={10000}
              step={10}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value, 10) || 100)}
            />
            <p className="text-xs text-muted-foreground">
              Two submissions within this distance are considered to be at the
              same location. Default: 100m. Range: 10–10,000m.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dedup-window">Time window (minutes)</Label>
            <Input
              id="dedup-window"
              type="number"
              min={1}
              max={1440}
              value={window}
              onChange={(e) => setWindow(parseInt(e.target.value, 10) || 480)}
            />
            <p className="text-xs text-muted-foreground">
              Only submissions made within this many minutes of each other are
              checked for duplicates. Default: 480 min (8 hours). Range: 1–1,440 min (24 hours).
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  )
}
