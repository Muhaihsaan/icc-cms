import type { Access, Where } from 'payload'

import { getUserTenantData } from '@/access/helpers'
import { isSuperAdmin, isSuperEditor } from '@/access/role-checks'

// Allow reading tenants scoped to tenant assignments, with full access for super-admins and super-editors.
export const tenantsReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isSuperEditor(user)) return true

  const tenantData = getUserTenantData(req)
  if (tenantData.allTenantIds.length === 0) return false

  const where: Where = {
    and: [{ id: { in: tenantData.allTenantIds } }, { deletedAt: { exists: false } }],
  }
  return where
}

// Allow updating tenants for tenant admins, super-admins, and super-editors.
export const tenantsUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isSuperEditor(user)) return true

  const tenantData = getUserTenantData(req)
  if (tenantData.adminTenantIds.length === 0) return false

  return {
    id: { in: tenantData.adminTenantIds },
  }
}
