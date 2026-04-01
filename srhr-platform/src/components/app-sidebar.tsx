"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  ClipboardList,
  KeyRound,
  Building2,
  Bell,
  ScrollText,
  Settings,
  Database,
  LogOut,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { signOut } from "@/lib/auth/client"
import { useRouter } from "next/navigation"

const navItems = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Management",
    items: [
      { title: "Users", url: "/admin/users", icon: Users },
      { title: "Access Codes", url: "/admin/access-codes", icon: KeyRound, superAdminOnly: true },
      { title: "Questionnaires", url: "/admin/questionnaires", icon: FileQuestion },
      { title: "Submissions", url: "/admin/submissions", icon: ClipboardList },
      { title: "Facilities", url: "/admin/facilities", icon: Building2 },
    ],
  },
  {
    title: "Monitoring",
    items: [
      { title: "Alerts", url: "/admin/alerts", icon: Bell },
      { title: "Audit Log", url: "/admin/audit-log", icon: ScrollText },
    ],
  },
  {
    title: "System",
    items: [
      { title: "Data Sources", url: "/admin/data-sources", icon: Database, superAdminOnly: true },
      { title: "Settings", url: "/admin/settings", icon: Settings, superAdminOnly: true },
    ],
  },
]

export function AppSidebar({ role, ...props }: React.ComponentProps<typeof Sidebar> & { role: string }) {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Image
            src="/hushaid-logo-mark.svg"
            alt="Hushaid"
            width={33}
            height={32}
            className="h-7 w-auto"
          />
          <strong className="text-lg">Hushaid</strong>
          <small className="text-xs text-muted-foreground">Admin</small>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navItems.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.superAdminOnly || role === "super_admin",
          )
          if (visibleItems.length === 0) return null
          return (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.url === "/admin"
                          ? pathname === "/admin"
                          : pathname.startsWith(item.url)
                      }
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={async () => {
                await signOut()
                router.push("/admin/log-in")
                router.refresh()
              }}
              className="text-muted-foreground"
            >
              <LogOut className="size-4" />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
