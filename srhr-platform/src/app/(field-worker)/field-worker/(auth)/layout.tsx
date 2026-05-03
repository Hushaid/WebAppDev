import Image from "next/image"
import Link from "next/link"

export default function FieldWorkerAuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-muted/50 p-4">
      <Link href="/" className="mb-8">
        <Image
          src="/hushaid-full-logo-new.svg"
          alt="Hushaid"
          width={137}
          height={32}
          priority
          className="w-40 h-auto"
        />
      </Link>
      <article className="w-full max-w-md">{children}</article>
    </main>
  )
}
