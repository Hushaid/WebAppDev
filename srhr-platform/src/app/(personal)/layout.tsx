import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { SignOutButton } from "@/components/sign-out-button"

export const metadata: Metadata = {
  title: {
    default: "Health Assessment",
    template: "%s — Hushaid",
  },
  description: "Take a confidential SRHR health risk assessment and get personalised recommendations for nearby health facilities.",
}

export default function PersonalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="flex h-14 items-center justify-between px-4">
          <Link href="/personal">
            <Image
              src="/hushaid-logo.svg"
              alt="Hushaid"
              width={137}
              height={32}
              priority
              className="w-[120px] h-auto"
            />
          </Link>
          <SignOutButton />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
    </section>
  )
}
