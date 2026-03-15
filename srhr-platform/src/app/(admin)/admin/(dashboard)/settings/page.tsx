import { getDedupSettings } from "./actions"
import { SettingsContent } from "./settings-content"

export default async function SettingsPage() {
  const { radiusMeters, windowMinutes } = await getDedupSettings()

  return (
    <SettingsContent
      dedupRadius={radiusMeters}
      dedupWindow={windowMinutes}
    />
  )
}
