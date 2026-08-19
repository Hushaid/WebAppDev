import { NextResponse } from "next/server"
import { Resend } from "resend"

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, message } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.error("RESEND_API_KEY not set — contact form submission dropped")
    return NextResponse.json({ error: "Email service not configured." }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"

  const safeName = escapeHtml(String(name))
  const safeEmail = escapeHtml(String(email))
  const safeMessage = escapeHtml(String(message))

  try {
    const result = await resend.emails.send({
      from: emailFrom,
      to: "Info@hushaid.com",
      replyTo: String(email),
      subject: `Contact form: ${String(name)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2>New contact form submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Name</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td>
            </tr>
          </table>
          <p style="white-space: pre-wrap;">${safeMessage}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Sent from the Hushaid landing page contact form.</p>
        </div>
      `,
    })

    console.log("Contact email result:", JSON.stringify(result))

    if (result.error) {
      console.error("Resend API error:", result.error)
      return NextResponse.json({ error: "Failed to send message." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to send contact email:", error)
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 })
  }
}
