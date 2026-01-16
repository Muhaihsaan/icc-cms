'use client'

import { useAuth } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { z } from 'zod'


const Roles = {
  tenantAdmin: 'tenant-admin',
} as const

const tenantEntrySchema = z.object({
  tenant: z.union([z.string(), z.number(), z.object({ id: z.union([z.string(), z.number()]) })]),
  roles: z.array(z.string()).nullable().optional(),
})

const userTenantsSchema = z.object({
  tenants: z.array(tenantEntrySchema).nullable().optional(),
})

const getTenantAdminTenantId = (user: unknown): string | number | undefined => {
  const parsed = userTenantsSchema.safeParse(user)
  if (!parsed.success) return undefined
  const tenants = parsed.data.tenants
  if (!tenants || tenants.length !== 1) return undefined

  const entry = tenants[0]
  if (!entry) return undefined

  // Check if user has tenant-admin role
  const roles = entry.roles
  if (!roles || !roles.includes(Roles.tenantAdmin)) return undefined

  // Extract tenant ID
  const tenant = entry.tenant
  if (typeof tenant === 'string' || typeof tenant === 'number') return tenant
  if (typeof tenant === 'object' && tenant !== null && 'id' in tenant) return tenant.id
  return undefined
}

// Only redirects when on tenant-level (tenant selected or tenant-admin user)
// Top-level users with "Top Level" selected see the full tenants list
export function TenantsListRedirect(): null {
  const { user } = useAuth()
  const tenantSelection = useTenantSelection()
  const router = useRouter()

  const selectedTenantIdSchema = z.union([z.string(), z.number()])
  const selectedTenantIdParsed = selectedTenantIdSchema.safeParse(tenantSelection?.selectedTenantID)
  const selectedTenantId = selectedTenantIdParsed.success ? selectedTenantIdParsed.data : undefined

  useEffect(() => {
    // Determine target tenant ID
    let targetTenantId: string | number | undefined

    // If a tenant is selected via TenantSelector, use that
    if (selectedTenantId) {
      targetTenantId = selectedTenantId
    } else {
      // Otherwise, check if user is a tenant-admin with single tenant
      targetTenantId = getTenantAdminTenantId(user)
    }

    // No tenant selected (Top Level) - don't redirect, show full list
    if (!targetTenantId) return

    router.replace(`/admin/collections/tenants/${targetTenantId}`)
  }, [user, selectedTenantId, router])

  return null
}

export default TenantsListRedirect
