type TranslatedVariant = {
  text: string
  options?: Record<string, string>
}

export type QuestionTranslations = {
  pcm?: TranslatedVariant
  ha?: TranslatedVariant
}

export async function translateQuestion(
  text: string,
  options?: { value: string; label: string }[],
): Promise<QuestionTranslations> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.error("[translate-question] GROQ_API_KEY is not set")
    return {}
  }

  const optionsBlock = options?.length
    ? `\nAnswer options (translate each label, keep the key exactly as-is):\n${options.map((o) => `  "${o.value}": "${o.label}"`).join("\n")}`
    : ""

  const prompt = `You are a professional translator for Nigerian community health surveys.
Translate the question and every option label into:
1. Nigerian Pidgin English (pcm)
2. Hausa (ha)

CRITICAL RULES:
- Translate EVERY word — including common words like "Yes", "No", "Male", "Female", "Always", "Never", etc.
- In Hausa: "Yes" = "Eh / Ɗai", "No" = "A'a", "Male" = "Namiji", "Female" = "Mace"
- In Pidgin: "Yes" = "Yes/Ehen", "No" = "No/Nope", "Male" = "Man", "Female" = "Woman"
- Never leave option labels in English.
- Keep the JSON key exactly as given — only translate the value.

Return ONLY valid JSON, no markdown, no explanation:
{
  "pcm": { "text": "...", "options": { "key": "pidgin translation" } },
  "ha":  { "text": "...", "options": { "key": "hausa translation" } }
}
Omit "options" if there are no options to translate.

Question: "${text}"${optionsBlock}`

  let res: Response
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    })
  } catch (err) {
    console.error("[translate-question] Fetch failed:", err)
    return {}
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "(unreadable)")
    console.error(`[translate-question] Groq API error ${res.status}:`, errText)
    return {}
  }

  const json = await res.json()
  const raw: string = json?.choices?.[0]?.message?.content ?? ""
  if (!raw) return {}

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()

  try {
    return JSON.parse(cleaned) as QuestionTranslations
  } catch {
    return {}
  }
}
