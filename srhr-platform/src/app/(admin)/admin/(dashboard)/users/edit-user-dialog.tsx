"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Pencil } from "lucide-react"

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

function stripPhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10)
}

/** Extract 10 local digits from stored +234... format or raw */
function toLocalDigits(stored: string): string {
  if (!stored) return ""
  const clean = stored.replace(/\D/g, "")
  if (clean.startsWith("234") && clean.length === 13) return clean.slice(3)
  return clean.slice(0, 10)
}

interface EditUserDialogProps {
  userId: string
  currentName: string
  currentEmail: string
  currentPhone: string
  currentAlternatePhone: string
  currentHomeAddress: string
  currentSex: string
}

export function EditUserDialog({
  userId,
  currentName,
  currentEmail,
  currentPhone,
  currentAlternatePhone,
  currentHomeAddress,
  currentSex,
}: EditUserDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sex, setSex] = useState(currentSex || "")
  const [phoneDisplay, setPhoneDisplay] = useState(formatPhone(toLocalDigits(currentPhone)))
  const [altPhoneDisplay, setAltPhoneDisplay] = useState(formatPhone(toLocalDigits(currentAlternatePhone)))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const fd = new FormData(e.currentTarget)
    const rawPhone = stripPhone(phoneDisplay)
    const rawAltPhone = stripPhone(altPhoneDisplay)

    const result = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "details",
        name: (fd.get("name") as string).trim(),
        phone: rawPhone ? `+234${rawPhone}` : "",
        alternatePhone: rawAltPhone ? `+234${rawAltPhone}` : "",
        homeAddress: (fd.get("homeAddress") as string).trim(),
        sex,
      }),
    }).then((response) => response.json())

    if (!result.success) {
      setError(result.error ?? "Failed to update user.")
    } else {
      setOpen(false)
      router.refresh()
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
            <Label>Sex</Label>
            <RadioGroup value={sex} onValueChange={setSex} className="flex flex-row gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="eu-sex-male" />
                <Label htmlFor="eu-sex-male" className="font-normal cursor-pointer">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="eu-sex-female" />
                <Label htmlFor="eu-sex-female" className="font-normal cursor-pointer">Female</Label>
              </div>
            </RadioGroup>
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="eu-phone">Phone Number</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">+234</span>
              <Input
                id="eu-phone"
                type="tel"
                inputMode="numeric"
                value={phoneDisplay}
                onChange={(e) => setPhoneDisplay(formatPhone(stripPhone(e.target.value)))}
                placeholder="803 456 7890"
                maxLength={12}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <Label htmlFor="eu-alt-phone">Alternate Phone Number</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">+234</span>
              <Input
                id="eu-alt-phone"
                type="tel"
                inputMode="numeric"
                value={altPhoneDisplay}
                onChange={(e) => setAltPhoneDisplay(formatPhone(stripPhone(e.target.value)))}
                placeholder="803 456 7890"
                maxLength={12}
              />
            </div>
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
