import type { Metadata } from "next"
import Image from "next/image"

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
      <Image
        src="/hushaid-logo.svg"
        alt="Hushaid"
        width={137}
        height={32}
        priority
        className="mb-8 w-40 h-auto"
      />
      <section className="w-full max-w-md">{children}</section>
    </main>
  )
}
