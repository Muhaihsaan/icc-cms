import type { AccessArgs } from 'payload'
import { z } from 'zod'
import { Roles } from '@/access'
import { normalizeTenantId } from '@/access/helpers'

const rolesArraySchema = z.array(z.string())

type AssignUsersToOneTenantArgs = {
  req: AccessArgs['req'] & { tenant?: { id?: string } }
  value?: unknown
}

export const assignUsersToOneTenant = ({ req, value }: AssignUsersToOneTenantArgs) => {
  const { user, tenant } = req
  if (!user) return value

  const rolesParsed = rolesArraySchema.safeParse(user.roles)
  if (rolesParsed.success && rolesParsed.data.includes(Roles.superAdmin)) return value

  let currentTenant = normalizeTenantId(tenant)

  if (!currentTenant && user.tenants && user.tenants.length === 1) {
    const firstTenant = user.tenants[0]
    if (firstTenant) {
      currentTenant = normalizeTenantId(firstTenant.tenant)
    }
  }

  if (!currentTenant) return value

  return [{ tenant: currentTenant, roles: [Roles.tenantViewer] }]
}
