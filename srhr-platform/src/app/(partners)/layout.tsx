import Image from "next/image"
import Link from "next/link"

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex h-14 items-center gap-6 px-6">
          <Link href="/partners">
            <Image
              src="/hushaid-logo.svg"
              alt="Hushaid"
              width={120}
              height={28}
              priority
            />
          </Link>
          <menu className="flex items-center gap-4">
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
          </menu>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </section>
  )
}
