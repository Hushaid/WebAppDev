"use client"

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

export interface FilterValues {
  diseaseGroup: string
  riskLevel: string
  dateFrom: string
  dateTo: string
}

interface IrixFiltersProps {
  filters: FilterValues
  onChange: (filters: FilterValues) => void
  onReset: () => void
}

export const DEFAULT_FILTERS: FilterValues = {
  diseaseGroup: "all",
  riskLevel: "all",
  dateFrom: "",
  dateTo: "",
}

export function IrixFilters({ filters, onChange, onReset }: IrixFiltersProps) {
  function update(key: keyof FilterValues, value: string) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <fieldset className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label htmlFor="disease-group">Disease Group</Label>
        <Select
          value={filters.diseaseGroup}
          onValueChange={(v) => update("diseaseGroup", v)}
        >
          <SelectTrigger id="disease-group" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="sti">STI Risk</SelectItem>
            <SelectItem value="maternal_health">Maternal Health</SelectItem>
            <SelectItem value="community_wellbeing">Community Well-being</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="risk-level">Risk Level</Label>
        <Select
          value={filters.riskLevel}
          onValueChange={(v) => update("riskLevel", v)}
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
          value={filters.dateFrom}
          onChange={(e) => update("dateFrom", e.target.value)}
          className="w-40"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="date-to">To</Label>
        <Input
          id="date-to"
          type="date"
          value={filters.dateTo}
          onChange={(e) => update("dateTo", e.target.value)}
          className="w-40"
        />
      </div>

      <Button variant="outline" onClick={onReset}>
        Reset
      </Button>
    </fieldset>
  )
}
