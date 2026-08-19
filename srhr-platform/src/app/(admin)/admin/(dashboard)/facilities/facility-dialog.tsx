"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Plus, Pencil } from "lucide-react"

const FACILITY_TYPES = ["PHC", "General Hospital", "Health Post", "Maternity Centre"]

interface FacilityData {
  name: string
  type: string
  address?: string
  ward?: string
  lga?: string
  gpsLat?: string
  gpsLng?: string
}

export function CreateFacilityDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState("PHC")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await fetch("/api/admin/facilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (fd.get("name") as string).trim(),
        type,
        address: (fd.get("address") as string).trim() || undefined,
        ward: (fd.get("ward") as string).trim() || undefined,
        lga: (fd.get("lga") as string).trim() || undefined,
        gpsLat: (fd.get("gpsLat") as string).trim() || undefined,
        gpsLng: (fd.get("gpsLng") as string).trim() || undefined,
      } satisfies FacilityData),
    }).then((response) => response.json())

    if (!result.success) {
      toast.error(result.error ?? "Failed to add facility")
      setLoading(false)
      return
    }

    toast.success("Facility added")
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add facility
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Health Facility</DialogTitle>
        </DialogHeader>
        <form id="create-facility" onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label htmlFor="cf-name">Facility Name</Label>
            <Input id="cf-name" name="name" required />
          </fieldset>
          <fieldset className="space-y-2">
            <Label>Facility Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FACILITY_TYPES.map((facilityType) => (
                  <SelectItem key={facilityType} value={facilityType}>
                    {facilityType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="space-y-2">
              <Label htmlFor="cf-ward">Ward</Label>
              <Input id="cf-ward" name="ward" />
            </fieldset>
            <fieldset className="space-y-2">
              <Label htmlFor="cf-lga">LGA</Label>
              <Input id="cf-lga" name="lga" />
            </fieldset>
          </div>
          <fieldset className="space-y-2">
            <Label htmlFor="cf-address">Address</Label>
            <Input id="cf-address" name="address" />
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="space-y-2">
              <Label htmlFor="cf-lat">Latitude</Label>
              <Input id="cf-lat" name="gpsLat" type="number" step="any" />
            </fieldset>
            <fieldset className="space-y-2">
              <Label htmlFor="cf-lng">Longitude</Label>
              <Input id="cf-lng" name="gpsLng" type="number" step="any" />
            </fieldset>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="create-facility" disabled={loading}>
            {loading ? "Adding..." : "Add facility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EditFacilityDialog({
  facility,
}: {
  facility: {
    id: string
    name: string
    type: string
    address: string | null
    ward: string | null
    lga: string | null
    gpsLat: string | null
    gpsLng: string | null
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(facility.type)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await fetch(`/api/admin/facilities/${facility.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (fd.get("name") as string).trim(),
        type,
        address: (fd.get("address") as string).trim() || undefined,
        ward: (fd.get("ward") as string).trim() || undefined,
        lga: (fd.get("lga") as string).trim() || undefined,
        gpsLat: (fd.get("gpsLat") as string).trim() || undefined,
        gpsLng: (fd.get("gpsLng") as string).trim() || undefined,
      } satisfies FacilityData),
    }).then((response) => response.json())

    if (!result.success) {
      toast.error(result.error ?? "Failed to update facility")
      setLoading(false)
      return
    }

    toast.success("Facility updated")
    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Facility</DialogTitle>
        </DialogHeader>
        <form id={`edit-facility-${facility.id}`} onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label>Facility Name</Label>
            <Input name="name" defaultValue={facility.name} required />
          </fieldset>
          <fieldset className="space-y-2">
            <Label>Facility Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FACILITY_TYPES.map((facilityType) => (
                  <SelectItem key={facilityType} value={facilityType}>
                    {facilityType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="space-y-2">
              <Label>Ward</Label>
              <Input name="ward" defaultValue={facility.ward ?? ""} />
            </fieldset>
            <fieldset className="space-y-2">
              <Label>LGA</Label>
              <Input name="lga" defaultValue={facility.lga ?? ""} />
            </fieldset>
          </div>
          <fieldset className="space-y-2">
            <Label>Address</Label>
            <Input name="address" defaultValue={facility.address ?? ""} />
          </fieldset>
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="space-y-2">
              <Label>Latitude</Label>
              <Input name="gpsLat" type="number" step="any" defaultValue={facility.gpsLat ?? ""} />
            </fieldset>
            <fieldset className="space-y-2">
              <Label>Longitude</Label>
              <Input name="gpsLng" type="number" step="any" defaultValue={facility.gpsLng ?? ""} />
            </fieldset>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={`edit-facility-${facility.id}`} disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
