"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/sign-out-button"
import { Button } from "@/components/ui/button"

export function PartnersShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <section className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b bg-background">
        <nav className="flex h-14 items-center gap-6 px-4 sm:px-6">
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

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto sm:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {menuOpen ? (
                <path d="M4 4l12 12M16 4L4 16" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" />
              )}
            </svg>
          </Button>

          {/* Desktop nav */}
          <menu className="hidden flex-1 items-center gap-4 sm:flex">
            <li>
              <Link
                href="/partners"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/partners/alerts"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Alerts
              </Link>
            </li>
            <li>
              <Link
                href="/partners/exports"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Exports
              </Link>
            </li>
            <li>
              <Link
                href="/partners/preferences"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Preferences
              </Link>
            </li>
          </menu>
          <span className="hidden sm:block">
            <SignOutButton />
          </span>
        </nav>

        {/* Mobile nav */}
        {menuOpen && (
          <menu className="flex flex-col gap-2 border-t px-4 py-3 sm:hidden">
            <li>
              <Link
                href="/partners"
                className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/partners/alerts"
                className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                Alerts
              </Link>
            </li>
            <li>
              <Link
                href="/partners/exports"
                className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                Exports
              </Link>
            </li>
            <li>
              <Link
                href="/partners/preferences"
                className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
                onClick={() => setMenuOpen(false)}
              >
                Preferences
              </Link>
            </li>
            <li className="border-t pt-2">
              <SignOutButton />
            </li>
          </menu>
        )}
      </header>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
    </section>
  )
}
