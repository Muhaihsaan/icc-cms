import type { AccessArgs } from 'payload'
import { Roles } from '@/access/accessPermission'

type AssignUsersToOneTenantArgs = {
  req: AccessArgs['req'] & { tenant?: { id?: string } }
  value?: unknown
}

const normalizeTenantId = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = value.id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
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
