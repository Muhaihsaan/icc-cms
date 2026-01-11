import type { AccessArgs } from 'payload'
import { Roles } from '@/access/accessPermission'
import { normalizeTenantId } from '@/access/helpers'

type AssignUsersToOneTenantArgs = {
  req: AccessArgs['req'] & { tenant?: { id?: string } }
  value?: unknown
}

const assignUsersToOneTenant = ({ req, value }: AssignUsersToOneTenantArgs) => {
  const { user, tenant } = req
  if (!user) return value
  if (user?.roles?.includes(Roles.superAdmin)) return value
  let currentTenant = normalizeTenantId(tenant)
  if (!currentTenant) {
    const userTenants = user?.tenants || []
    if (userTenants.length === 1) {
      currentTenant = normalizeTenantId(userTenants[0]?.tenant)
    }
  }

  if (!currentTenant) {
    throw new Error('Tenant context is required to assign a user to a tenant.')
  }
  return [{ tenant: currentTenant, roles: [Roles.tenantViewer] }]
}

export default assignUsersToOneTenant
