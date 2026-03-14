"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const labels: Record<string, string> = {
  admin: "Admin",
  users: "Users",
  "access-codes": "Access Codes",
  questionnaires: "Questionnaires",
  submissions: "Submissions",
  facilities: "Facilities",
  alerts: "Alerts",
  "audit-log": "Audit Log",
  "data-sources": "Data Sources",
  settings: "Settings",
}

function isUuid(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  // Split: /admin/submissions/abc-123 → ["admin", "submissions", "abc-123"]
  const segments = pathname.split("/").filter(Boolean)

  const crumbs = segments.map((segment, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/")
    const label = isUuid(segment)
      ? segment.slice(0, 8) + "..."
      : labels[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    return { href, label }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <BreadcrumbItem key={crumb.href}>
              {i > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
