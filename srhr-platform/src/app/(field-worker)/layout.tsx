import Image from "next/image"
import Link from "next/link"

export default function FieldWorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex h-14 items-center justify-between px-4">
          <Link href="/field-worker">
            <Image
              src="/hushaid-logo.svg"
              alt="Hushaid"
              width={120}
              height={28}
              priority
            />
          </Link>
          <mark className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
            Online
          </mark>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </section>
  )
}
