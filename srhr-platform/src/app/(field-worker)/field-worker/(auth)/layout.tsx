import Image from "next/image"

export default function FieldWorkerAuthLayout({
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
          width={137}
          height={32}
          priority
          className="w-40 h-auto"
        />
      </figure>
      <article className="w-full max-w-md">{children}</article>
    </main>
  )
}
