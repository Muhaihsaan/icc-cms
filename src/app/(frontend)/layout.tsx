import type { Metadata } from 'next'
import React from 'react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Iced Coffee Club Centralized CMS',
  description: 'Multi-tenant headless content management system',
}

export default function FrontendLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}
