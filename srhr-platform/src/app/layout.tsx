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
    default: "Hushaid",
    template: "%s — Hushaid",
  },
  description:
    "Community health risk platform for sexual and reproductive health.",
  icons: {
    icon: "/hushaid-mark.svg",
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
