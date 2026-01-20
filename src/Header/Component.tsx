import { HeaderClient } from './Component.client'
import { getTenantCachedGlobal } from '@/utilities/tenant/get-tenant-globals'
import React from 'react'
import { z } from 'zod'

import type { Header, Tenant } from '@/payload-types'

const headerValidationSchema = z.object({
  id: z.union([z.string(), z.number()]),
})

const headerSchema = z.custom<Header>((val) => headerValidationSchema.safeParse(val).success)

interface HeaderProps {
  tenant: Tenant | null
}

export async function Header({ tenant }: HeaderProps) {
  if (!tenant) return null

  const headerResult = await getTenantCachedGlobal('header', 1, tenant)()
  const parsed = headerSchema.safeParse(headerResult)
  if (!parsed.success) return null

  return <HeaderClient tenant={tenant} data={parsed.data} />
}
