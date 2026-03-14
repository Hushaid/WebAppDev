import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Partners Dashboard",
    template: "%s — Partners — Hushaid",
  },
  description: "Hushaid partners dashboard for viewing community health risk maps, IRIX scores, and generating reports.",
}

export default function PartnersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
