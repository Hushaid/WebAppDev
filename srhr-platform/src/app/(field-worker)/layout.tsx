import Image from "next/image"
import Link from "next/link"
import { OnlineIndicator } from "@/components/online-indicator"

export default function FieldWorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex h-14 items-center justify-between px-4">
          <Link href="/field-worker/questionnaire">
            <Image
              src="/hushaid-logo.svg"
              alt="Hushaid"
              width={120}
              height={28}
              priority
            />
          </Link>
          <OnlineIndicator />
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </section>
  )
}
