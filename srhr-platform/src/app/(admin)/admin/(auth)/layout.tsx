import Image from "next/image"

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/50 p-4">
      <figure className="mb-8">
        <Image
          src="/hushaid-logo.svg"
          alt="Hushaid"
          width={160}
          height={38}
          priority
        />
      </figure>
      <article className="w-full max-w-md">{children}</article>
    </main>
  )
}
