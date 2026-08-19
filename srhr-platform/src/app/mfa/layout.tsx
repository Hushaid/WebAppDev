import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: {
    default: "Two-Factor Authentication",
    template: "%s — Hushaid",
  },
  description: "Set up or verify two-factor authentication for your Hushaid account.",
}

export default function MfaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center p-4">
      <Link href="/" className="mb-8">
        <Image
          src="/hushaid-full-logo-new.svg"
          alt="Hushaid"
          width={137}
          height={32}
          priority
          className="w-40 h-auto"
        />
      </Link>
      <section className="w-full max-w-md">{children}</section>
    </main>
  )
}
