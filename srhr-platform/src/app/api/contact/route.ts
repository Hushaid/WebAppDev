import { NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: Request) {
  const body = await request.json()
  const { name, email, message } = body

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // Log but don't expose to client
    console.error("RESEND_API_KEY not set — contact form submission dropped")
    return NextResponse.json({ ok: true })
  }

  const resend = new Resend(resendKey)
  const emailFrom = process.env.EMAIL_FROM ?? "Hushaid <onboarding@resend.dev>"

  try {
    await resend.emails.send({
      from: emailFrom,
      to: "Info@hushaid.com",
      replyTo: email,
      subject: `Contact form: ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h2>New contact form submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Name</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 600; background: #f8fafc;">Email</td>
              <td style="padding: 8px 12px; border: 1px solid #e2e8f0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
          </table>
          <p style="white-space: pre-wrap;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">Sent from the Hushaid landing page contact form.</p>
        </div>
      `,
    })
  } catch (error) {
    console.error("Failed to send contact email:", error)
  }

  return NextResponse.json({ ok: true })
}
