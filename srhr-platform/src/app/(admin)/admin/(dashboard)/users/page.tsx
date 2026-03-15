export const dynamic = "force-dynamic"

import { getUsers, updateUserRole, updateUserStatus } from "./actions"
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

export default async function UsersPage() {
  const allUsers = await getUsers()

  return (
    <section className="space-y-6">
      <AdminHeaderAction>
        <CreateUserDialog />
      </AdminHeaderAction>

      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Manage platform users, roles, and access.
        </p>
      </header>

      <div className="overflow-x-auto">
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
          {allUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            allUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name ?? "—"}</TableCell>
                <TableCell>{user.email}</TableCell>
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
                    updateRole={updateUserRole}
                    updateStatus={updateUserStatus}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>
    </section>
  )
}
