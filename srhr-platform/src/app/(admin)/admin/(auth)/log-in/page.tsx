import { LoginForm } from "@/components/auth/login-form"

export default function AdminLogInPage() {
  return (
    <LoginForm
      title="Admin Log In"
      description="Sign in to the Hushaid admin panel."
      redirectTo="/admin"
      forgotPasswordHref="/forgot-password"
    />
  )
}
