export const dynamic = "force-dynamic"

import { getUsers } from "./actions"
import { EditUserDialog } from "./edit-user-dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { UserActions } from "./user-actions"
import { CreateUserDialog } from "./create-user-dialog"
import { AdminHeaderAction } from "@/components/admin-header-action"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Suspense } from "react"
import { UserRoleFilter } from "./role-filter"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; sex?: string }>
}) {
  const params = await searchParams
  const filterRole = params.role || "all"
  const filterSex = params.sex || "all"
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role ?? "admin"
  const callerId = session?.user?.id ?? ""
  const isSuperAdmin = callerRole === "super_admin"
  const allUsers = await getUsers()

  const filteredUsers = allUsers.filter((u) => {
    if (filterRole !== "all" && u.role !== filterRole) return false
    if (filterSex !== "all" && (u.sex ?? "") !== filterSex) return false
    return true
  })

  /** Mask PII for non-super_admin viewers */
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

  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      {/* Fixed header area */}
      <div className="shrink-0 border-b p-6 pb-4">
        {isSuperAdmin && (
          <AdminHeaderAction>
            <CreateUserDialog callerRole={callerRole} />
          </AdminHeaderAction>
        )}

        <header>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage platform users, roles, and access.
          </p>
        </header>
        <div className="mt-4">
          <Suspense>
            <UserRoleFilter currentRole={filterRole} currentSex={filterSex} showSexFilter={filterRole === "personal_user"} />
          </Suspense>
        </div>
      </div>

      {/* Scrollable table area */}
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
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
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
                      {user.createdAt.toLocaleDateString()}
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
    </div>
  )
}
