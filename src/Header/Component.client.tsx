'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme/header-theme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header, Tenant } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav/nav'

interface HeaderClientProps {
  tenant: Tenant
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ tenant, data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
  }, [pathname, setHeaderTheme])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
  }, [headerTheme, theme])

  return (
    <header className="container relative z-20   " {...(theme ? { 'data-theme': theme } : {})}>
      <div className="py-8 flex justify-between">
        <Link href="/">
          <Logo tenant={tenant} loading="eager" priority="high" className="invert dark:invert-0" />
        </Link>
        <HeaderNav data={data} tenant={tenant} />
      </div>
    </header>
  )
}
