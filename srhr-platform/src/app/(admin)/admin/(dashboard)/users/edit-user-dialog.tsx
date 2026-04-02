"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Pencil } from "lucide-react"

interface EditUserDialogProps {
  userId: string
  currentName: string
  currentEmail: string
  currentPhone: string
  currentAlternatePhone: string
  currentHomeAddress: string
  currentSex: string
  updateUserDetails: (
    userId: string,
    data: {
      name: string
      phone: string
      alternatePhone: string
      homeAddress: string
      sex: string
    },
  ) => Promise<{ success: boolean; error?: string }>
}

export function EditUserDialog({
  userId,
  currentName,
  currentEmail,
  currentPhone,
  currentAlternatePhone,
  currentHomeAddress,
  currentSex,
  updateUserDetails,
}: EditUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sex, setSex] = useState(currentSex || "")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const result = await updateUserDetails(userId, {
      name: (fd.get("name") as string).trim(),
      phone: (fd.get("phone") as string).trim(),
      alternatePhone: (fd.get("alternatePhone") as string).trim(),
      homeAddress: (fd.get("homeAddress") as string).trim(),
      sex,
    })

    if (!result.success) {
      setError(result.error ?? "Failed to update user.")
    } else {
      setOpen(false)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Details</DialogTitle>
          <DialogDescription>
            Update profile information for {currentEmail}.
          </DialogDescription>
        </DialogHeader>
        <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
          <fieldset className="space-y-2">
            <Label htmlFor="eu-name">Full Name</Label>
            <Input id="eu-name" name="name" defaultValue={currentName} required minLength={2} />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="eu-sex">Sex</Label>
            <Select value={sex} onValueChange={setSex}>
              <SelectTrigger id="eu-sex">
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="eu-phone">Phone Number</Label>
            <Input id="eu-phone" name="phone" type="tel" defaultValue={currentPhone} />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="eu-alt-phone">Alternate Phone Number</Label>
            <Input id="eu-alt-phone" name="alternatePhone" type="tel" defaultValue={currentAlternatePhone} />
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="eu-address">Home Address</Label>
            <Input id="eu-address" name="homeAddress" defaultValue={currentHomeAddress} />
          </fieldset>
          {error && (
            <output className="block rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {error}
            </output>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-user-form" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
