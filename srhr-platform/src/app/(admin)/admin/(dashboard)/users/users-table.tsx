"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"
import { EditUserDialog } from "./edit-user-dialog"
import { UserActions } from "./user-actions"

type User = {
  id: string
  name: string | null
  email: string
  sex: string | null
  phone: string | null
  alternatePhone: string | null
  homeAddress: string | null
  role: string
  status: string
  createdAt: Date
}

interface UsersTableProps {
  users: User[]
  isSuperAdmin: boolean
  callerRole: string
  callerId: string
}

export function UsersTable({ users, isSuperAdmin, callerRole, callerId }: UsersTableProps) {
  const [search, setSearch] = useState("")

  function mask(value: string | null, visibleChars = 2): string {
    if (isSuperAdmin || !value) return value ?? "—"
    if (value.length <= visibleChars) return "*".repeat(value.length)
    return `${value.slice(0, visibleChars)}${"*".repeat(Math.max(0, value.length - visibleChars))}`
  }
  function maskEmail(email: string) {
    if (isSuperAdmin) return email
    const [local, domain] = email.split("@")
    return `${local.slice(0, 2)}***@${domain}`
  }

  const filtered = search.trim()
    ? users.filter((u) => {
        const q = search.toLowerCase()
        return (
          (u.name?.toLowerCase().includes(q) ?? false) ||
          u.email.toLowerCase().includes(q)
        )
      })
    : users

  return (
    <>
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {search.trim() ? "No users match your search." : "No users found."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{mask(user.name)}</TableCell>
                  <TableCell>{maskEmail(user.email)}</TableCell>
                  <TableCell className="capitalize">{user.sex ?? "—"}</TableCell>
                  <TableCell>{mask(user.phone, 3)}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{mask(user.homeAddress, 4)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === "active"
                          ? "default"
                          : user.status === "suspended"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <time dateTime={user.createdAt.toISOString()}>
                      {user.createdAt.toLocaleDateString("en-US")}
                    </time>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isSuperAdmin && (
                        <EditUserDialog
                          userId={user.id}
                          currentName={user.name ?? ""}
                          currentEmail={user.email}
                          currentPhone={user.phone ?? ""}
                          currentAlternatePhone={user.alternatePhone ?? ""}
                          currentHomeAddress={user.homeAddress ?? ""}
                          currentSex={user.sex ?? ""}
                        />
                      )}
                      <UserActions
                        userId={user.id}
                        userName={user.name ?? user.email}
                        currentRole={user.role}
                        currentStatus={user.status}
                        callerRole={callerRole}
                        callerId={callerId}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
