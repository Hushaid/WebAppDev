import type { Metadata } from "next"
import { Geist_Mono, Nunito_Sans } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/components/providers"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ServiceWorkerRegister } from "@/components/sw-register"
import { ToastTriggers } from "@/components/toast-triggers"
import { Toaster } from "sonner"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: {
    default: "Hushaid — SRHR Community Health Risk Platform",
    template: "%s — Hushaid",
  },
  description:
    "AI-powered Sexual and Reproductive Health Rights (SRHR) community health risk assessment platform for flood-affected communities in Nigeria. Collect field data, score individual health risks, and generate actionable insights for humanitarian responders.",
  icons: {
    icon: [
      { url: "/hushaid-logo-mark.svg", type: "image/svg+xml", sizes: "any" },
    ],
  },
}

const nunitoSans = Nunito_Sans({variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", nunitoSans.variable)}
    >
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Providers>
            <TooltipProvider>{children}</TooltipProvider>
            <ServiceWorkerRegister />
            <ToastTriggers />
            <Toaster richColors position="top-center" />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
