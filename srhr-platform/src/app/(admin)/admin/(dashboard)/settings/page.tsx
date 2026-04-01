import { getDedupSettings, getThresholdSettings } from "./actions"
import { SettingsContent } from "./settings-content"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const callerRole = (session?.user as { role?: string })?.role
  if (callerRole !== "super_admin") redirect("/admin")
  const { radiusMeters, windowMinutes } = await getDedupSettings()
  const thresholds = await getThresholdSettings()

  return (
    <SettingsContent
      dedupRadius={radiusMeters}
      dedupWindow={windowMinutes}
      thresholds={thresholds}
    />
  )
}
