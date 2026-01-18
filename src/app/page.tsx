import Link from 'next/link'

export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f5f5f5',
        padding: '2rem',
      }}
    >
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          marginBottom: '1rem',
          color: '#333',
        }}
      >
        Headless CMS
      </h1>
      <p
        style={{
          fontSize: '1.125rem',
          color: '#666',
          marginBottom: '2rem',
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        This is a headless content management system. Access the admin panel to manage your content.
      </p>
      <Link
        href="/admin"
        style={{
          display: 'inline-block',
          padding: '0.75rem 2rem',
          backgroundColor: '#333',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
      >
        Go to Admin Panel
      </Link>
    </main>
  )
}
