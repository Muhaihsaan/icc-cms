import Link from 'next/link'
import React from 'react'
import { z } from 'zod'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector/theme-selector'
import { CMSLink } from '@/components/Link/link'
import { Logo } from '@/components/Logo/Logo'
import { getTenantCachedGlobal } from '@/utilities/tenant/get-tenant-globals'

import type { Tenant, Footer } from '@/payload-types'

const footerValidationSchema = z.object({
  id: z.union([z.string(), z.number()]),
})

const footerSchema = z.custom<Footer>((val) => footerValidationSchema.safeParse(val).success)

interface FooterProps {
  tenant: Tenant | null
}

export async function Footer({ tenant }: FooterProps) {
  if (!tenant) return null
  const footerResult = await getTenantCachedGlobal('footer', 1, tenant)()
  const parsed = footerSchema.safeParse(footerResult)
  if (!parsed.success) return null

  const navItems = parsed.data.navItems || []

  return (
    <footer className="mt-auto border-t border-border bg-black dark:bg-card text-white">
      <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-between">
        <Link className="flex items-center" href="/">
          <Logo tenant={tenant} loading="lazy" priority="low" />
        </Link>

        <div className="flex flex-col-reverse items-start md:flex-row gap-4 md:items-center">
          <ThemeSelector />
          <nav className="flex flex-col md:flex-row gap-4">
            {navItems.map(({ link }) => {
              const key = link.url || link.label || ''
              return <CMSLink className="text-white" key={key} {...link} />
            })}
          </nav>
        </div>
      </div>
    </footer>
  )
}
