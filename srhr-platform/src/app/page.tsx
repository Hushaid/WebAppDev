export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

const roleRoutes: Record<string, string> = {
  admin: "/admin",
  super_admin: "/admin",
  field_worker: "/field-worker",
  personal_user: "/personal/questionnaire",
  partner: "/partners",
}

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect("/log-in")
  }

  const role = (session.user as { role?: string }).role || "personal_user"
  const destination = roleRoutes[role] || "/log-in"
  redirect(destination)
}
