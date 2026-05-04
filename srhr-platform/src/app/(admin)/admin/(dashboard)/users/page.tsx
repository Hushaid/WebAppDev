export const dynamic = "force-dynamic"

import { getUsers } from "./actions"
import { CreateUserDialog } from "./create-user-dialog"
import { AdminHeaderAction } from "@/components/admin-header-action"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { Suspense } from "react"
import { UserRoleFilter } from "./role-filter"
import { UsersTable } from "./users-table"

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

      {/* Scrollable table area with inline search */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 pt-4 gap-4">
        <UsersTable
          users={filteredUsers}
          isSuperAdmin={isSuperAdmin}
          callerRole={callerRole}
          callerId={callerId}
        />
      </div>
    </div>
  )
}
