import type { Metadata } from "next"
import { PartnersShell } from "@/components/partners/partners-shell"

export const metadata: Metadata = {
  title: "Partners",
}

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnersShell>{children}</PartnersShell>
}
