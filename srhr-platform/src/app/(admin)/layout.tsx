import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Admin Panel",
    template: "%s — Admin — Hushaid",
  },
  description: "Hushaid administration panel for managing users, questionnaires, submissions, and system settings.",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
