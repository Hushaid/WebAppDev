import { PartnersShell } from "@/components/partners/partners-shell"

export default function PartnersDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PartnersShell>{children}</PartnersShell>
}
