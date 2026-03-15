"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import { SignOutButton } from "@/components/sign-out-button"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const links = [
  { href: "/partners", label: "Dashboard" },
  { href: "/partners/alerts", label: "Alerts" },
  { href: "/partners/exports", label: "Exports" },
  { href: "/partners/preferences", label: "Preferences" },
]

export function PartnersShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  function isActive(href: string) {
    if (href === "/partners") return pathname === "/partners"
    return pathname.startsWith(href)
  }

  return (
    <section className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b bg-background">
        <nav className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/partners">
              <Image
                src="/hushaid-logo.svg"
                alt="Hushaid"
                width={137}
                height={32}
                priority
                className="w-[120px] h-auto"
              />
            </Link>

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
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:block">
              <SignOutButton />
            </span>

            {/* Mobile hamburger menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
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
                  <div className="mt-4 border-t pt-4">
                    <SignOutButton />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </section>
  )
}
