"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface GeographicUnit {
  id: string
  name: string
  level: string
}

interface SetCoverageAreaDialogProps {
  userId: string
  currentGeographicUnitId: string | null
  currentName: string
  userRole: string
  geographicUnits: GeographicUnit[]
}

export function SetCoverageAreaDialog({
  userId,
  currentGeographicUnitId,
  currentName,
  userRole,
  geographicUnits,
}: SetCoverageAreaDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // Radix Select doesn't accept empty string — use "ALL" as sentinel for "no restriction"
  const [selected, setSelected] = useState(currentGeographicUnitId ?? "ALL")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Only render for partners
  if (userRole !== "partner") return null

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "coverage_area",
          geographicUnitId: selected === "ALL" ? null : selected,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? "Failed to update coverage area.")
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Set Coverage Area">
          <MapPin className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Set Coverage Area</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Restrict <strong>{currentName}</strong> to alerts from a specific geographic area. Partners with no area set see all alerts.
          </p>
          <div className="space-y-2">
            <Label>Geographic Area</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="All Areas (no restriction)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Areas (no restriction)</SelectItem>
                {geographicUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                    <span className="ml-1 text-xs text-muted-foreground capitalize">({unit.level})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
