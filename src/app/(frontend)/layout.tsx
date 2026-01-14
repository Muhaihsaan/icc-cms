import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'
import { z } from 'zod'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'
import { headers } from 'next/headers'
import { fetchTenantByDomain } from '@/utilities/createTenantRequest'
import { notFound } from 'next/navigation'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

// treats this route as dynamic SSR to prevent accidental SSG behavior
export const dynamic = 'force-dynamic'

// Schema for allowPublicRead: handles both legacy boolean and new array format
const allowPublicReadSchema = z.union([z.boolean(), z.array(z.string())])

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const tenant = await fetchTenantByDomain(host)

  // Handle backward compatibility: boolean (legacy) or array (new)
  const parsed = allowPublicReadSchema.safeParse(tenant?.allowPublicRead)
  const allowPublicRead = parsed.success ? parsed.data : false
  const hasPublicAccess = Array.isArray(allowPublicRead)
    ? allowPublicRead.length > 0
    : allowPublicRead === true

  if (!hasPublicAccess) {
    return notFound()
  }

  return (
    <html className={cn(GeistSans.variable, GeistMono.variable)} lang="en" suppressHydrationWarning>
      <head>
        <InitTheme />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header tenant={tenant} />
          {children}
          <Footer tenant={tenant} />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    creator: '@payloadcms',
  },
}
