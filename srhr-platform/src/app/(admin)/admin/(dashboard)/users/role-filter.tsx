"use client"

import { useRouter } from "next/navigation"
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

export function UserRoleFilter({ currentRole }: { currentRole: string }) {
  const router = useRouter()

  return (
    <Select
      value={currentRole}
      onValueChange={(value) => {
        const params = new URLSearchParams()
        if (value !== "all") params.set("role", value)
        router.push(`/admin/users${params.toString() ? `?${params}` : ""}`)
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filter by role" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
