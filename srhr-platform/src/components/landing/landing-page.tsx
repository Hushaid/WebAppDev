"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import {
  Heart,
  Users,
  ClipboardCheck,
  ArrowRight,
  MapPin,
  BarChart3,
  Lock,
  Mail,
  Send,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Image
            src="/hushaid-full-logo-new.svg"
            alt="Hushaid"
            width={137}
            height={32}
            priority
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/log-in">Log in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/create-account">Get started</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm text-muted-foreground">
              Confidential risk assessments
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Know your risk,{" "}
              <span className="text-primary">own your future</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Hushaid empowers communities across Nigeria with confidential,
              AI-powered sexual and reproductive health risk assessments
              — by collecting community and climate data to generate actionable insights.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="/create-account">
                  Take a health assessment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="#portals">View all portals</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How Hushaid works
            </h2>
            <p className="mt-4 text-muted-foreground">
              A complete platform for community health assessment and response
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<ClipboardCheck className="h-6 w-6" />}
              title="Confidential assessments"
              description="Complete a guided questionnaire covering STI risk, maternal health, and community wellbeing — privately."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="AI risk scoring"
              description="Instant risk classification across health categories, powered by a clinically-informed scoring engine."
            />
            <FeatureCard
              icon={<MapPin className="h-6 w-6" />}
              title="Geographic insights"
              description="GPS-tagged submissions build a real-time health map for humanitarian responders and partners."
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="End-to-end privacy"
              description="No personal identifiers required. Data is encrypted and access is role-controlled at every level."
            />
          </div>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="scroll-mt-20 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Choose your portal
            </h2>
            <p className="mt-4 text-muted-foreground">
              Hushaid serves different users with tailored experiences
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Personal User */}
            <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
              <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
              <CardHeader className="pb-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Heart className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Personal User</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Take a confidential health risk assessment on your own.
                  Assess your STI, maternal health, and community
                  wellbeing risks privately.
                </CardDescription>
              </CardHeader>
              <div className="flex gap-2 px-6 pb-6">
                <Button className="flex-1" asChild>
                  <Link href="/create-account">
                    Create account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/log-in">Log in</Link>
                </Button>
              </div>
            </Card>

            {/* Field Worker */}
            <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
              <div className="absolute inset-x-0 top-0 h-1 bg-chart-2" />
              <CardHeader className="pb-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Field / Health Worker</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Conduct health assessments in the community on behalf
                  of individuals. GPS-tagged submissions help build a
                  real-time picture of health risks across regions.
                </CardDescription>
              </CardHeader>
              <div className="flex gap-2 px-6 pb-6">
                <Button
                  className="flex-1 bg-chart-2 text-white hover:bg-chart-2/90"
                  asChild
                >
                  <Link href="/field-worker/register">
                    Register
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/field-worker/log-in">Log in</Link>
                </Button>
              </div>
            </Card>

            {/* Partner / Admin */}
            <Card className="group relative overflow-hidden transition-shadow hover:shadow-lg">
              <div className="absolute inset-x-0 top-0 h-1 bg-chart-5" />
              <CardHeader className="pb-4">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-chart-5/10 text-chart-5">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Partner / Admin</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  Access dashboards, review submissions, manage alerts,
                  and generate insights. For NGOs, government agencies,
                  and platform administrators.
                </CardDescription>
              </CardHeader>
              <div className="flex gap-2 px-6 pb-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <Link href="/partners/log-in">Partner login</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/log-in">Admin login</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats / Trust */}
      <section className="border-t bg-muted/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary sm:text-4xl">50+</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Health questions per assessment
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary sm:text-4xl">3</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Risk categories scored
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary sm:text-4xl">100%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Confidential & anonymous
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Ready to assess your health risk?
            </h2>
            <p className="mt-3 text-primary-foreground/80">
              It takes about 10 minutes. Your answers are confidential
              and never linked to your identity.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-8"
              asChild
            >
              <Link href="/create-account">
                Start your assessment
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="scroll-mt-20 border-t bg-muted/30 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Contact us
            </h2>
            <p className="mt-4 text-muted-foreground">
              Have questions or want to partner with us? Get in touch.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-2">
            {/* Info */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 rounded-xl border bg-background p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email us</p>
                  <a
                    href="mailto:Info@hushaid.com"
                    className="text-sm text-primary hover:underline"
                  >
                    Info@hushaid.com
                  </a>
                </div>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                Whether you are an NGO, government agency, healthcare provider,
                or community leader — we would love to hear from you. Send us a
                message and our team will get back to you shortly.
              </p>
            </div>

            {/* Contact Form */}
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <Image
            src="/hushaid-full-logo-new.svg"
            alt="Hushaid"
            width={100}
            height={24}
            className="h-6 w-auto opacity-60"
          />
          <p className="text-sm text-muted-foreground">
            Confidential health assessments for Nigerian communities.
          </p>
        </div>
      </footer>
    </div>
  )
}

function ContactForm() {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSending(true)
    setError("")

    const form = e.currentTarget
    const data = new FormData(form)

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setError(body?.error || "Something went wrong. Please try again.")
        return
      }

      setSent(true)
      form.reset()
    } catch {
      setError("Could not reach the server. Please try again.")
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-background p-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Send className="h-5 w-5" />
        </div>
        <h3 className="font-semibold">Message sent</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you for reaching out. We will get back to you soon.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setSent(false)}
        >
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-background p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="contact-name">Name</Label>
        <Input
          id="contact-name"
          name="name"
          placeholder="Your name"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-email">Email address</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          placeholder="How can we help?"
          rows={4}
          required
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" disabled={sending} className="mt-2">
        {sending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Send message
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border bg-background p-6 transition-shadow hover:shadow-md">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
