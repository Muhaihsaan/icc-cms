import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome</h1>
      <p>
        <Link href="/admin">Go to admin panel</Link>
      </p>
    </main>
  )
}
