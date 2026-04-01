import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminBreadcrumb } from "@/components/admin-breadcrumb"
import { AdminHeaderActionSlot } from "@/components/admin-header-action"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  const role = (session?.user as { role?: string })?.role ?? "admin"

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset className="h-dvh overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <AdminBreadcrumb />
          <AdminHeaderActionSlot />
        </header>
        <div className="min-w-0 flex-1 overflow-y-auto p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
