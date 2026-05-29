"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, History, X } from "lucide-react"

interface HistoryDatePickerProps {
  value: string | null  // ISO date "YYYY-MM-DD", null = live/today
  onChange: (date: string | null) => void
}

const MIN_DATE = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  return d.toISOString().slice(0, 10)
})()

export function HistoryDatePicker({ value, onChange }: HistoryDatePickerProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const yesterday = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const isLive = !value || value >= today

  function step(days: number) {
    const base = value && value < today ? value : today
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    const next = d.toISOString().slice(0, 10)
    if (next > today) { onChange(null); return }
    if (next < MIN_DATE) return
    onChange(next)
  }

  if (isLive) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => onChange(yesterday)}
      >
        <History className="h-3.5 w-3.5" />
        History
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => step(-1)}
        disabled={value <= MIN_DATE}
        title="Previous day"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <input
        type="date"
        value={value}
        max={yesterday}
        min={MIN_DATE}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-7 rounded-md border border-input bg-background px-2 text-xs"
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => step(1)}
        disabled={value >= yesterday}
        title="Next day"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground"
        onClick={() => onChange(null)}
        title="Return to live"
      >
        <X className="h-3 w-3" />
        Live
      </Button>
    </div>
  )
}
