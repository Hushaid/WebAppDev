import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Field worker",
}

export default function FieldWorkerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
