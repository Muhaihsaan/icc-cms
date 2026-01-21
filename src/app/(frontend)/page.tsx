import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <Image
        src="/icc-logo.png"
        alt="ICC Logo"
        width={150}
        height={150}
        className="mb-6"
      />
      <h1 className="text-4xl font-bold mb-4 text-primary">Iced Coffee Club Centralized CMS</h1>
      <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
        Access the admin panel to manage your content.
      </p>
      <Link
        href="/admin"
        className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded font-medium hover:opacity-90 transition-opacity"
      >
        Go to Admin Panel
      </Link>
    </main>
  )
}
