import Image from "next/image"
import Link from "next/link"
import { OnlineIndicator } from "@/components/online-indicator"
import { SignOutButton } from "@/components/sign-out-button"
import { FieldWorkerNav } from "./nav"

export default function FieldWorkerDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b bg-background">
        <nav className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="/field-worker">
              <Image
                src="/hushaid-logo.svg"
                alt="Hushaid"
                width={137}
                height={32}
                priority
                className="w-[120px] h-auto"
              />
            </Link>
            <FieldWorkerNav />
          </div>
          <div className="flex items-center gap-3">
            <OnlineIndicator />
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl p-4">{children}</div>
      </main>
    </section>
  )
}
