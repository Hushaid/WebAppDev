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

  const prompt = `You are translating a health survey question for Nigerian communities.
Translate the question and its options into:
1. Nigerian Pidgin English (pcm)
2. Hausa (ha)

Return ONLY valid JSON — no markdown, no explanation — in this exact shape:
{
  "pcm": { "text": "...", "options": { "key": "translation" } },
  "ha":  { "text": "...", "options": { "key": "translation" } }
}
Omit "options" from a locale object if there are no options.
Keep medical/health terms accurate and culturally appropriate.

Question: "${text}"${optionsBlock}`

  console.log("[translate-question] Calling Groq for:", text.slice(0, 60))

  let res: Response
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
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
  console.log("[translate-question] Raw Groq response:", JSON.stringify(json).slice(0, 300))

  const raw: string = json?.choices?.[0]?.message?.content ?? ""

  if (!raw) {
    console.error("[translate-question] Empty text in response. Full response:", JSON.stringify(json))
    return {}
  }

  // Strip optional ```json fences the model sometimes adds
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()
  console.log("[translate-question] Cleaned text to parse:", cleaned.slice(0, 200))

  try {
    const parsed = JSON.parse(cleaned) as QuestionTranslations
    console.log("[translate-question] Parsed OK, locales:", Object.keys(parsed))
    return parsed
  } catch (err) {
    console.error("[translate-question] JSON.parse failed:", err, "| raw:", cleaned.slice(0, 200))
    return {}
  }
}
