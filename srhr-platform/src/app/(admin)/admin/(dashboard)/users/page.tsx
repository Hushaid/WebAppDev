export const dynamic = "force-dynamic"

import { getUsers, updateUserRole, updateUserStatus, deleteUser } from "./actions"
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

import { UserRoleFilter } from "./role-filter"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const params = await searchParams
  const filterRole = params.role || "all"
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  const callerRole = (session?.user as { role?: string } | undefined)?.role ?? "admin"
  const callerId = session?.user?.id ?? ""
  const isSuperAdmin = callerRole === "super_admin"
  const allUsers = await getUsers()
  const filteredUsers = filterRole === "all" ? allUsers : allUsers.filter(u => u.role === filterRole)

  /** Mask PII for non-super_admin viewers */
  function maskEmail(email: string) {
    if (isSuperAdmin) return email
    const [local, domain] = email.split("@")
    return `${local.slice(0, 2)}***@${domain}`
  }
  function maskName(name: string | null) {
    if (isSuperAdmin || !name) return name ?? "—"
    return `${name.slice(0, 2)}${"*".repeat(Math.max(0, name.length - 2))}`
  }

  return (
    <div className="-m-6 flex h-[calc(100%+48px)] flex-col">
      {/* Fixed header area */}
      <div className="shrink-0 border-b p-6 pb-4">
        {callerRole === "super_admin" && (
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
          <UserRoleFilter currentRole={filterRole} />
        </div>
      </div>

      {/* Scrollable table area */}
      <div className="min-h-0 flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{maskName(user.name)}</TableCell>
                  <TableCell>{maskEmail(user.email)}</TableCell>
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
                    <UserActions
                      userId={user.id}
                      userName={user.name ?? user.email}
                      currentRole={user.role}
                      currentStatus={user.status}
                      callerRole={callerRole}
                      callerId={callerId}
                      updateRole={updateUserRole}
                      updateStatus={updateUserStatus}
                      deleteUser={deleteUser}
                    />
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
