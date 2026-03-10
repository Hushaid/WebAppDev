import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type RiskLevel = "low" | "medium" | "high"

const LOW_RISK_STEPS = [
  "Abstain from sex, or be faithful to one partner. If you have more than one partner, always use a condom.",
  "Use a condom every time you have sex. Condoms protect against both infections and unwanted pregnancy.",
  "Avoid risky sexual practices such as anal sex, which increases the chance of getting an infection.",
  "If you notice any unusual discharge, sores, burning when you urinate, or pain during sex — visit a health facility as soon as possible for the right treatment. Do not self-medicate.",
  "If you are being treated for an infection, abstain from sex until your treatment is complete. Make sure your partner is also treated.",
  "If you are pregnant or think you might be: register for antenatal care early — ideally between 8 and 12 weeks of pregnancy. Do not wait.",
  "Attend every antenatal appointment and take all medications prescribed by your health worker.",
  "Go to the hospital immediately if you experience any of the following during pregnancy: severe headache or dizziness, swollen feet or face, bleeding from your vagina, unusual vaginal discharge, or reduced movement of your baby.",
  "Collect your delivery kit early — before your due date. It should include gloves, soap, a clean wrapper, baby clothes, cap, socks, towel, a delivery pad, and a cord tie.",
  "Know the signs of labour and know which facility you will go to. Have a transport plan ready before your due date.",
  "If you or someone in your community is experiencing gender-based violence — report it. You can call 0800-9210-0009. The call is free and confidential.",
]

const MEDIUM_RISK_STEPS = [
  "Visit a health facility within the next 2 days for a check-up and screening. Tell the health worker all the symptoms you have been experiencing, even if they seem small.",
  "Ask to be tested for HIV and other infections such as syphilis and gonorrhoea on the same visit. Many infections can be fully treated with the right medication.",
  "If you are pregnant and have not started antenatal care, or have missed visits, go to the nearest health facility this week.",
  "Your sexual partner should also be screened and treated. Contact tracing is important to stop the spread of infection.",
]

const HIGH_RISK_STEPS = [
  "Go to a health facility TODAY. Do not wait. Your answers suggest you may have a serious infection or pregnancy complication that needs urgent attention.",
  "If you cannot get to a health facility because roads are flooded or you have no transport — call NEMA Emergency on 080022556362 now and ask for emergency health support. Tell them your community name.",
  "If a health worker has been notified about your situation, they will call ahead to the health facility so that staff are ready to receive you on arrival. Do not be afraid — the health workers are there to help you.",
  "After this emergency visit, the health worker will follow up with you to make sure you are recovering well and to remove any barriers that may stop you from returning for follow-up care. Please keep your phone on and available.",
]

function getStepsForRiskLevel(level: RiskLevel) {
  const steps = [...LOW_RISK_STEPS]
  if (level === "medium" || level === "high") {
    steps.push(...MEDIUM_RISK_STEPS)
  }
  if (level === "high") {
    steps.push(...HIGH_RISK_STEPS)
  }
  return steps
}

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

function riskLabel(level: RiskLevel) {
  switch (level) {
    case "high":
      return "Your answers indicate a high level of risk. Please follow these steps urgently."
    case "medium":
      return "Your answers indicate a moderate level of risk. Please follow these steps within the next few days."
    default:
      return "Your answers indicate a low level of risk. Follow these steps to stay healthy."
  }
}

interface HealthStepsProps {
  riskLevel: RiskLevel
}

export function HealthSteps({ riskLevel }: HealthStepsProps) {
  const steps = getStepsForRiskLevel(riskLevel)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Steps to protect your health
          <Badge variant={riskBadgeVariant(riskLevel)} className="text-sm">
            {riskLevel} risk
          </Badge>
        </CardTitle>
        <CardDescription>
          {riskLabel(riskLevel)}
        </CardDescription>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
}

const EMERGENCY_CONTACTS = [
  {
    name: "WARIF Helpline",
    description: "Sexual violence support",
    number: "0800-9210-0009",
    tel: "tel:080092100009",
    availability: "Free \u00b7 24 hours \u00b7 Confidential",
  },
  {
    name: "National Emergency",
    description: "All life-threatening emergencies",
    number: "112",
    tel: "tel:112",
    availability: "Free \u00b7 24 hours",
  },
  {
    name: "NEMA Emergency",
    description: "National disaster & flood response",
    number: "080022556362",
    tel: "tel:080022556362",
    availability: "Free \u00b7 24 hours",
  },
  {
    name: "NCC Consumer Helpline",
    description: "Telecoms complaints & support",
    number: "767",
    tel: "tel:767",
    availability: "Free \u00b7 24 hours",
  },
]

export function EmergencyContacts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Help is always available</CardTitle>
        <CardDescription>
          24/7 support for health emergencies and gender-based violence. You are not alone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EMERGENCY_CONTACTS.map((contact) => (
            <li key={contact.number} className="rounded-lg border p-3">
              <h3 className="font-medium">{contact.name}</h3>
              <p className="text-xs text-muted-foreground">{contact.description}</p>
              <a
                href={contact.tel}
                className="mt-1 inline-block text-lg font-semibold text-primary underline"
              >
                {contact.number}
              </a>
              <p className="text-xs text-muted-foreground">{contact.availability}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
