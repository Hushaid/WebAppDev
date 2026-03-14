import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Field Worker",
    template: "%s — Field Worker — Hushaid",
  },
  description: "Hushaid field worker portal for conducting community health risk assessments.",
}

export default function FieldWorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
