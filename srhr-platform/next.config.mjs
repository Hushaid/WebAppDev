import { withSentryConfig } from "@sentry/nextjs"
import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Allow middleware to run on the Node.js runtime so it can call the
    // auth DB directly instead of making a self-referential HTTP call.
    nodeMiddleware: true,
    serverActions: {
      allowedOrigins: ["srhr.localhost", "srhr.localhost:1355", "localhost:3000", "localhost:4139"],
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com",
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://*.mapbox.com https://api.qrserver.com",
              "connect-src 'self' http://*.localhost:* https://*.mapbox.com https://events.mapbox.com https://api.mapbox.com https://*.sentry.io",
              "worker-src 'self' blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

const sentryConfig = withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  telemetry: false,
})

export default sentryConfig
