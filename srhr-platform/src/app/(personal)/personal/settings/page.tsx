import { ChangePasswordForm } from "@/components/auth/change-password-form"

export default function PersonalSettingsPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings.
        </p>
      </header>

      <ChangePasswordForm />
    </section>
  )
}
