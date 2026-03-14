import Image from "next/image"
import Link from "next/link"
import { OnlineIndicator } from "@/components/online-indicator"
import { SignOutButton } from "@/components/sign-out-button"

export default function FieldWorkerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <nav className="flex h-14 items-center justify-between px-4">
          <Link href="/field-worker/questionnaire">
            <Image
              src="/hushaid-logo.svg"
              alt="Hushaid"
              width={137}
              height={32}
              priority
              className="w-[120px] h-auto"
            />
          </Link>
          <div className="flex items-center gap-3">
            <OnlineIndicator />
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </section>
  )
}
