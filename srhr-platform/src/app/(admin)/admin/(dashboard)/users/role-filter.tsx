"use client"

import { useRouter, useSearchParams } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ROLES = [
  { value: "all", label: "All roles" },
  { value: "personal_user", label: "Personal user" },
  { value: "field_worker", label: "Field worker" },
  { value: "partner", label: "Partner" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
]

const SEX_OPTIONS = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
]

export function UserRoleFilter({ currentRole, currentSex, showSexFilter }: { currentRole: string; currentSex: string; showSexFilter: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function pushFilters(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === "all") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    }
    router.push(`/admin/users${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="flex items-center gap-3">
      <Select value={currentRole} onValueChange={(v) => pushFilters({ role: v })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by role" />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showSexFilter && (
        <Select value={currentSex} onValueChange={(v) => pushFilters({ sex: v })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by sex" />
          </SelectTrigger>
          <SelectContent>
            {SEX_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
