import type { Metadata } from "next"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Two-factor authentication",
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
        width={160}
        height={40}
        priority
        className="mb-8"
      />
      <section className="w-full max-w-md">{children}</section>
    </main>
  )
}
