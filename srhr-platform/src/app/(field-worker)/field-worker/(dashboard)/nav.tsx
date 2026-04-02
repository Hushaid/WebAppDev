"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function FieldWorkerNav() {
  const t = useTranslations("fieldWorker")
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const links = [
    { href: "/field-worker", label: t("nav.dashboard") },
    { href: "/field-worker/questionnaire", label: t("nav.newAssessment") },
    { href: "/field-worker/history", label: t("nav.history") },
    { href: "/field-worker/settings", label: t("nav.settings") },
  ]

  function isActive(href: string) {
    return href === "/field-worker"
      ? pathname === "/field-worker"
      : pathname.startsWith(href)
  }

  return (
    <>
      {/* Desktop nav */}
      <ul className="hidden items-center gap-1 sm:flex">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive(link.href)
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Mobile hamburger menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="sm:hidden">
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>{t("nav.menu")}</SheetTitle>
          </SheetHeader>
          <nav className="mt-4">
            <ul className="space-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      isActive(link.href)
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
