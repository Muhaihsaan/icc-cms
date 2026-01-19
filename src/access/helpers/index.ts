import type { AccessArgs } from 'payload'

import { Roles } from './roles'
import type { TenantManagedCollection } from '@/config'
import { Collections } from '@/config'
import {
  tenantsWithRolesSchema,
  userWithTenantsSchema,
  userWithTenantRolesSchema,
  reqWithTenantSchema,
  normalizeTenantId,
  isTopLevelUserSchema,
} from './zod-schema'

// Re-export roles and zod-schema
export { Roles } from './roles'
export type { Role } from './roles'
export * from './zod-schema'

const TENANT_COOKIE_NAME = 'payload-tenant'

/**
 * Check if a user or data object has the guest writer role in any tenant.
 * Works with both User objects and form data objects.
 */
export const hasGuestWriterRole = (data: unknown): boolean => {
  const parsed = tenantsWithRolesSchema.safeParse(data)
  if (!parsed.success) return false

  const tenants = parsed.data.tenants
  if (!tenants) return false

  for (const entry of tenants) {
    if (!entry?.roles) continue
    if (entry.roles.includes(Roles.guestWriter)) return true
  }
  return false
}

// Helper to get tenant IDs from user's tenants array
const getUserTenantIds = (user: unknown): Array<string | number> => {
  const parsed = userWithTenantsSchema.safeParse(user)
  if (!parsed.success || !parsed.data.tenants) return []

  const ids: Array<string | number> = []
  for (const entry of parsed.data.tenants) {
    if (!entry) continue
    const id = normalizeTenantId(entry.tenant)
    if (id !== undefined) ids.push(id)
  }
  return ids
}

export const getTenantFromReq = (req: AccessArgs['req']): unknown => {
  // First try to get from req.tenant (set by multi-tenant plugin) - trusted source
  const result = reqWithTenantSchema.safeParse(req)
  if (result.success && result.data.tenant !== undefined && result.data.tenant !== null) {
    return result.data.tenant
  }

  // Fallback: read from cookie (for collections where plugin doesn't set req.tenant)
  let cookieTenantId: string | undefined
  try {
    const cookieHeader = req.headers?.get?.('cookie')
    if (cookieHeader) {
      const cookies = cookieHeader.split(';')
      for (const cookie of cookies) {
        const trimmed = cookie.trim()
        const eqIndex = trimmed.indexOf('=')
        if (eqIndex === -1) continue
        const name = trimmed.substring(0, eqIndex)
        const value = trimmed.substring(eqIndex + 1)
        if (name === TENANT_COOKIE_NAME && value) {
          cookieTenantId = decodeURIComponent(value)
          break
        }
      }
    }
  } catch {
    // Ignore cookie parsing errors
  }

  if (!cookieTenantId) return undefined

  // Validate cookie tenant against user's access
  const user = req.user

  // No user (public request) - validate tenant exists before allowing
  // This prevents arbitrary tenant IDs while still allowing public content filtering
  if (!user) {
    // Only return cookie tenant if it looks like a valid ID format
    // Actual existence check happens downstream in access control
    const normalized = normalizeTenantId(cookieTenantId)
    return normalized !== undefined ? cookieTenantId : undefined
  }

  // Top-level users have access to all tenants
  if (isTopLevelUserSchema(user)) return cookieTenantId

  // Tenant-level users: validate cookie tenant is in their assigned tenants
  const userTenantIds = getUserTenantIds(user)
  const normalizedCookieId = normalizeTenantId(cookieTenantId)

  if (normalizedCookieId !== undefined && userTenantIds.includes(normalizedCookieId)) {
    return cookieTenantId
  }

  // Cookie tenant not in user's tenants - ignore it
  return undefined
}

// Get the first tenant ID from a user object (for field filtering)
export const getUserFirstTenantId = (user: unknown): string | number | undefined => {
  const parsed = userWithTenantsSchema.safeParse(user)
  if (!parsed.success) return undefined

  const tenants = parsed.data.tenants
  if (!tenants) return undefined

  const firstTenant = tenants[0]
  if (!firstTenant) return undefined

  return normalizeTenantId(firstTenant.tenant)
}

// User tenant data - computed from user.tenants array
export type UserTenantData = {
  allTenantIds: Array<string | number>
  adminTenantIds: Array<string | number>
  hasAdminRole: boolean
  hasTenantUserRole: boolean
  hasGuestWriterRole: boolean
  hasAnyRole: boolean
}

// Compute user tenant data from request
export const getUserTenantData = (req: AccessArgs['req']): UserTenantData => {
  const result: UserTenantData = {
    allTenantIds: [],
    adminTenantIds: [],
    hasAdminRole: false,
    hasTenantUserRole: false,
    hasGuestWriterRole: false,
    hasAnyRole: false,
  }

  const parsed = userWithTenantRolesSchema.safeParse(req.user)
  if (!parsed.success || !parsed.data.tenants) {
    return result
  }

  for (const entry of parsed.data.tenants) {
    if (!entry) continue

    const tenantId = normalizeTenantId(entry.tenant)
    if (tenantId !== undefined) {
      result.allTenantIds.push(tenantId)
    }

    if (!Array.isArray(entry.roles)) continue
    if (entry.roles.length > 0) result.hasAnyRole = true

    if (entry.roles.includes(Roles.tenantAdmin)) {
      result.hasAdminRole = true
      if (tenantId !== undefined) result.adminTenantIds.push(tenantId)
    }
    if (entry.roles.includes(Roles.tenantUser)) {
      result.hasTenantUserRole = true
    }
    if (entry.roles.includes(Roles.guestWriter)) {
      result.hasGuestWriterRole = true
    }
  }

  return result
}

// Fetch allowed collections for a tenant
export const getTenantAllowedCollections = async (
  req: AccessArgs['req'],
  tenantId: string | number,
): Promise<TenantManagedCollection[] | null | undefined> => {
  try {
    const tenant = await req.payload.findByID({
      collection: Collections.TENANTS,
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })

    if (!tenant) return undefined
    if (!Array.isArray(tenant.allowedCollections)) return null

    return tenant.allowedCollections as TenantManagedCollection[]
  } catch {
    return undefined
  }
}

// Fetch which collections allow public read for a tenant
export const getTenantAllowPublicRead = async ({
  req,
  tenantId,
}: {
  req: AccessArgs['req']
  tenantId: string | number
}): Promise<string[] | null> => {
  try {
    const tenant = await req.payload.findByID({
      collection: Collections.TENANTS,
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })

    if (!tenant) return null
    if (!Array.isArray(tenant.allowPublicRead)) return null

    return tenant.allowPublicRead
  } catch {
    return null
  }
}

/**
 * Get the effective tenant for access control decisions.
 * Top-level users in top-level mode (no tenant cookie) get undefined (no tenant filtering).
 * Returns undefined when in top-level mode, otherwise returns the tenant from cookie/request.
 */
export const getEffectiveTenant = (req: AccessArgs['req']): string | number | undefined => {
  // Non-top-level users: always use cookie-based tenant
  if (!isTopLevelUserSchema(req.user)) {
    return normalizeTenantId(getTenantFromReq(req))
  }

  // Top-level user: check if tenant cookie is set
  // If no tenant cookie, they're in top-level mode
  const tenantFromReq = getTenantFromReq(req)
  if (!tenantFromReq) {
    return undefined // Top-level mode - no tenant filtering
  }

  return normalizeTenantId(tenantFromReq)
}
