import { getTranslations } from "next-intl/server"
import { PersonalChangePasswordForm } from "@/components/personal/change-password-form"

export default async function PersonalSettingsPage() {
  const t = await getTranslations("personal.settingsPage")

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </header>

      <PersonalChangePasswordForm />
    </section>
  )
}
