"use client"

import { useTranslations } from "next-intl"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

type RiskLevel = "low" | "medium" | "high"

function riskBadgeVariant(level: RiskLevel) {
  switch (level) {
    case "high":
      return "destructive" as const
    case "medium":
      return "secondary" as const
    default:
      return "default" as const
  }
}

interface HealthStepsProps {
  riskLevel: RiskLevel
}

export function PersonalHealthSteps({ riskLevel }: HealthStepsProps) {
  const t = useTranslations("personal.healthSteps")
  const stepsLow = t.raw("stepsLow") as string[]
  const stepsMedium = t.raw("stepsMedium") as string[]
  const stepsHigh = t.raw("stepsHigh") as string[]

  const steps = [...stepsLow]
  if (riskLevel === "medium" || riskLevel === "high") {
    steps.push(...stepsMedium)
  }
  if (riskLevel === "high") {
    steps.push(...stepsHigh)
  }

  const label =
    riskLevel === "high"
      ? t("labelHigh")
      : riskLevel === "medium"
        ? t("labelMedium")
        : t("labelLow")

  const badge =
    riskLevel === "high"
      ? t("badgeHigh")
      : riskLevel === "medium"
        ? t("badgeMedium")
        : t("badgeLow")

  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="health-steps" className="border-0">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <span className="flex items-center gap-3">
            <span className="text-base font-semibold">{t("sectionTitle")}</span>
            <Badge variant={riskBadgeVariant(riskLevel)} className="text-xs">
              {badge}
            </Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4">
          <p className="mb-4 text-sm text-muted-foreground">{label}</p>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

const EMERGENCY_CONTACTS = [
  { name: "WARIF (Women at Risk International Foundation) Helpline", number: "0800-9210-0009", tel: "tel:080092100009" },
  { name: "National Emergency", number: "112", tel: "tel:112" },
  { name: "NEMA (National Emergency Management Agency)", number: "080022556362", tel: "tel:080022556362" },
  { name: "NCC (Nigerian Communications Commission) Helpline", number: "767", tel: "tel:767" },
]

export function PersonalEmergencyContacts() {
  const t = useTranslations("personal.emergencyContacts")
  const contacts = t.raw("contacts") as { description: string; availability: string }[]

  return (
    <Accordion type="single" collapsible className="rounded-lg border">
      <AccordionItem value="emergency" className="border-0">
        <AccordionTrigger className="px-6 py-4 hover:no-underline">
          <span className="text-base font-semibold">{t("sectionTitle")}</span>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-4">
          <p className="mb-4 text-sm text-muted-foreground">{t("description")}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {EMERGENCY_CONTACTS.map((contact, i) => (
              <li key={contact.number} className="rounded-lg border p-3">
                <h3 className="font-medium">{contact.name}</h3>
                <p className="text-xs text-muted-foreground">{contacts[i]?.description}</p>
                <a
                  href={contact.tel}
                  className="mt-1 inline-block text-lg font-semibold text-primary underline"
                >
                  {contact.number}
                </a>
                <p className="text-xs text-muted-foreground">{contacts[i]?.availability}</p>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
