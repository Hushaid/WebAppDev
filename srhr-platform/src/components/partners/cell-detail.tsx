"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CellScore {
  h3_index: string
  overall_irix_score: number
  overall_risk_level: string
  sti_avg_score: number | null
  maternal_avg_score: number | null
  community_wellbeing_avg_score: number | null
  submission_count: number
  hotspot_flag: boolean
}

interface CellDetailProps {
  cell: CellScore | null
  onClose: () => void
}

function riskVariant(level: string) {
  switch (level) {
    case "high":
      return "destructive" as const
    case "medium":
      return "secondary" as const
    default:
      return "default" as const
  }
}

export function CellDetail({ cell, onClose }: CellDetailProps) {
  if (!cell) return null

  return (
    <Card className="absolute bottom-4 left-4 z-10 w-80 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            Cell <code className="text-xs">{cell.h3_index.slice(0, 10)}...</code>
            {cell.hotspot_flag && (
              <Badge variant="destructive">Hotspot</Badge>
            )}
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close panel"
          >
            ✕
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Overall IRIX</dt>
          <dd className="text-end">
            <Badge variant={riskVariant(cell.overall_risk_level)}>
              {cell.overall_irix_score.toFixed(2)}
            </Badge>
          </dd>

          {cell.sti_avg_score !== null && (
            <>
              <dt className="text-muted-foreground">Infection Avg</dt>
              <dd className="text-end font-mono">{cell.sti_avg_score.toFixed(2)}</dd>
            </>
          )}

          {cell.maternal_avg_score !== null && (
            <>
              <dt className="text-muted-foreground">Maternal Avg</dt>
              <dd className="text-end font-mono">{cell.maternal_avg_score.toFixed(2)}</dd>
            </>
          )}

          {cell.community_wellbeing_avg_score !== null && (
            <>
              <dt className="text-muted-foreground">Community Avg</dt>
              <dd className="text-end font-mono">
                {cell.community_wellbeing_avg_score.toFixed(2)}
              </dd>
            </>
          )}

          <dt className="text-muted-foreground">Submissions</dt>
          <dd className="text-end font-mono">{cell.submission_count}</dd>
        </dl>
      </CardContent>
    </Card>
  )
}
