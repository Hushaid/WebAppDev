"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const languages = [
  { code: "en", label: "English" },
  { code: "ha", label: "Hausa" },
  { code: "yo", label: "Yoruba" },
  { code: "ig", label: "Igbo" },
  { code: "pcm", label: "Pidgin" },
] as const

export function LanguageSelector() {
  const router = useRouter()

  function handleChange(locale: string) {
    document.cookie = `locale=${locale};path=/;max-age=${60 * 60 * 24 * 365}`
    router.refresh()
  }

  // Read current locale from cookie
  const current =
    (typeof document !== "undefined" &&
      document.cookie
        .split("; ")
        .find((c) => c.startsWith("locale="))
        ?.split("=")[1]) ||
    "en"

  return (
    <Select defaultValue={current} onValueChange={handleChange}>
      <SelectTrigger className="w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
