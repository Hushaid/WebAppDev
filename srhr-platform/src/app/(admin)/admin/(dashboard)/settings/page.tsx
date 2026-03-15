import { getDedupSettings, getThresholdSettings } from "./actions"
import { SettingsContent } from "./settings-content"

export default async function SettingsPage() {
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
