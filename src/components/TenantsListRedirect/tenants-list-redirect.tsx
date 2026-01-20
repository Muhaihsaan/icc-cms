'use client'

import { useAuth } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { z } from 'zod'

import { getTenantAdminTenantId } from '@/access/client-checks'
import { useTopLevelMode } from '@/components/TenantSelector/top-level-mode-context'

// Only redirects when on tenant-level (tenant selected or tenant-admin user)
// Top-level users in top-level mode see the full tenants list
export function TenantsListRedirect(): null {
  const { user } = useAuth()
  const tenantSelection = useTenantSelection()
  const router = useRouter()
  const { isTopLevelMode } = useTopLevelMode()

  const selectedTenantIdSchema = z.union([z.string(), z.number()])
  const selectedTenantIdParsed = selectedTenantIdSchema.safeParse(tenantSelection?.selectedTenantID)
  const pluginTenantId = selectedTenantIdParsed.success ? selectedTenantIdParsed.data : undefined

  // Effective tenant ID: undefined if in top-level mode
  const selectedTenantId = isTopLevelMode ? undefined : pluginTenantId

  useEffect(() => {
    // If in top-level mode, don't redirect (show full list)
    if (isTopLevelMode) return

    // Determine target tenant ID
    let targetTenantId: string | number | undefined

    // If a tenant is selected via TenantSelector, use that
    if (selectedTenantId) {
      targetTenantId = selectedTenantId
    } else {
      // Otherwise, check if user is a tenant-admin with single tenant
      targetTenantId = getTenantAdminTenantId(user)
    }

    // No tenant selected - don't redirect
    if (!targetTenantId) return

    router.replace(`/admin/collections/tenants/${targetTenantId}`)
  }, [user, selectedTenantId, isTopLevelMode, router])

  return null
}

export default TenantsListRedirect
