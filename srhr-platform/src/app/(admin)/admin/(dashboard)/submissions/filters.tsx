"use client"

import { useRouter, usePathname } from "next/navigation"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface Props {
  submitterType?: string
  riskLevel?: string
  dateFrom?: string
  dateTo?: string
  flagged?: string
}

export function SubmissionFiltersBar({
  submitterType,
  riskLevel,
  dateFrom,
  dateTo,
  flagged,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { submitterType, riskLevel, dateFrom, dateTo, flagged, ...updates }
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") params.set(k, v)
    }
    // Reset to page 1 when filters change
    router.push(`${pathname}?${params.toString()}`)
  }

  function reset() {
    router.push(pathname)
  }

  const hasFilters = (submitterType && submitterType !== "all") ||
    (riskLevel && riskLevel !== "all") ||
    dateFrom || dateTo || flagged === "true"

  return (
    <fieldset className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label htmlFor="submitter-type">Submitter Type</Label>
        <Select
          value={submitterType || "all"}
          onValueChange={(v) => navigate({ submitterType: v })}
        >
          <SelectTrigger id="submitter-type" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="field_worker">Field Worker</SelectItem>
            <SelectItem value="personal_user">Personal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="risk-level">Risk Level</Label>
        <Select
          value={riskLevel || "all"}
          onValueChange={(v) => navigate({ riskLevel: v })}
        >
          <SelectTrigger id="risk-level" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="date-from">From</Label>
        <Input
          id="date-from"
          type="date"
          value={dateFrom ?? ""}
          onChange={(e) => navigate({ dateFrom: e.target.value || undefined })}
          className="w-40"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date-to">To</Label>
        <Input
          id="date-to"
          type="date"
          value={dateTo ?? ""}
          onChange={(e) => navigate({ dateTo: e.target.value || undefined })}
          className="w-40"
        />
      </div>

      <div className="flex items-center gap-2 pb-0.5">
        <Checkbox
          id="flagged"
          checked={flagged === "true"}
          onCheckedChange={(checked) =>
            navigate({ flagged: checked ? "true" : undefined })
          }
        />
        <Label htmlFor="flagged" className="cursor-pointer">Flagged only</Label>
      </div>

      {hasFilters && (
        <Button variant="outline" onClick={reset}>
          Reset
        </Button>
      )}
    </fieldset>
  )
}
