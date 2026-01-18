import type { AccessArgs, Validate } from 'payload'
import { z } from 'zod'

import { isSuperAdmin, Roles } from '@/access'
import { isSuperAdmin as isSuperAdminClient } from '@/access/client-checks'
import { Collections } from '@/config'

type TenantsValidateArgs = {
  req: AccessArgs['req']
  data: Partial<{ roles?: string | null }>
}

// Validate tenants field - ensures tenant is required for non-top-level users
export const validateTenantsField: Validate<unknown, unknown, unknown, TenantsValidateArgs> = async (
  value,
  { req, data },
) => {
  // Bootstrap: no logged-in user means first user creation - will become super-admin
  if (!req.user) {
    const existingUsers = await req.payload.find({
      collection: Collections.USERS,
      depth: 0,
      limit: 1,
    })
    // First user will be super-admin, no tenant needed
    if (existingUsers.totalDocs === 0) return true
  }
  if (isSuperAdmin(req.user)) return true
  // Top-level users (super-admin/super-editor) don't need tenant
  if (data?.roles) return true
  const arraySchema = z.array(z.unknown())
  const parsed = arraySchema.safeParse(value)
  if (!parsed.success || parsed.data.length < 1) {
    return 'Tenant is required for non super-admin users.'
  }
  if (parsed.data.length > 1) return 'Only one tenant allowed'
  return true
}

const tenantEntrySchema = z.object({
  roles: z.array(z.string()).nullable().optional(),
})

// Condition to show guestWriterPostLimit field - only for super-admins editing guest writers
export const showGuestWriterPostLimit = (
  data: Record<string, unknown> | undefined,
  _siblingData: Record<string, unknown>,
  { user }: { user: unknown },
): boolean => {
  if (!isSuperAdminClient(user)) return false
  // Check if the user being edited has guest-writer role
  const tenants = data?.tenants
  if (!Array.isArray(tenants) || tenants.length === 0) return false
  const firstTenant = tenants[0]
  const parsed = tenantEntrySchema.safeParse(firstTenant)
  if (!parsed.success || !parsed.data.roles) return false
  return parsed.data.roles.includes(Roles.guestWriter)
}
