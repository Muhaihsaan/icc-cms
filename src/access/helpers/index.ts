import type { AccessArgs } from 'payload'
import { z } from 'zod'

import { Roles } from '@/access/roles'
import type { TenantManagedCollection } from '@/config/tenant-collections'
import { Collections } from '@/config/collections'

const TENANT_COOKIE_NAME = 'payload-tenant'

// Schema for data with tenants array containing roles
const tenantsWithRolesSchema = z.object({
  tenants: z
    .array(
      z
        .object({
          roles: z.array(z.string()).nullable().optional(),
        })
        .nullable(),
    )
    .nullable()
    .optional(),
})

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

const tenantIdSchema = z.union([z.string(), z.number()])
const tenantIdObjectSchema = z.object({ id: tenantIdSchema })

// Schema that normalizes tenant value to just the ID using transform
export const tenantValueSchema = z.union([
  tenantIdSchema,
  tenantIdObjectSchema.transform((obj) => obj.id),
])

const reqWithTenantSchema = z.object({ tenant: z.unknown() })

// Schema for user with tenants array (needed for cookie validation)
const userWithTenantsSchema = z.object({
  tenants: z
    .array(
      z
        .object({
          tenant: z.unknown(),
        })
        .nullable(),
    )
    .nullable()
    .optional(),
})

// Schema to check if user is top-level (inline to avoid circular dependency)
const topLevelUserSchema = z.object({
  roles: z.enum([Roles.superAdmin, Roles.superEditor]),
})

// Helper to check if user is top-level (super-admin or super-editor)
const isTopLevelUserInline = (user: unknown): boolean => {
  return topLevelUserSchema.safeParse(user).success
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

  // No user (public request) - allow cookie for public content filtering
  if (!user) return cookieTenantId

  // Top-level users have access to all tenants
  if (isTopLevelUserInline(user)) return cookieTenantId

  // Tenant-level users: validate cookie tenant is in their assigned tenants
  const userTenantIds = getUserTenantIds(user)
  const normalizedCookieId = normalizeTenantId(cookieTenantId)

  if (normalizedCookieId !== undefined && userTenantIds.includes(normalizedCookieId)) {
    return cookieTenantId
  }

  // Cookie tenant not in user's tenants - ignore it
  return undefined
}

// Schema that converts numeric strings to numbers
const numericStringSchema = z.string().transform((val) => {
  const num = Number(val)
  if (Number.isNaN(num) || !Number.isFinite(num)) return val
  return num
})

// Schema for normalizing tenant ID - converts numeric strings to numbers
const normalizedTenantIdSchema = z.union([
  z.number(),
  numericStringSchema,
  tenantIdObjectSchema.transform((obj) => {
    const id = obj.id
    const numParsed = z.number().safeParse(id)
    if (numParsed.success) return numParsed.data
    const strParsed = numericStringSchema.safeParse(id)
    if (strParsed.success) return strParsed.data
    return id
  }),
])

// Normalize tenant value to number ID (or string if non-numeric) using Zod schema validation
export const normalizeTenantId = (value: unknown): string | number | undefined => {
  const result = normalizedTenantIdSchema.safeParse(value)
  if (!result.success) return undefined
  return result.data
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

// Schema for user with tenants containing roles
const userWithTenantRolesSchema = z.object({
  tenants: z
    .array(
      z
        .object({
          tenant: z.unknown(),
          roles: z.array(z.string()).nullable().optional(),
        })
        .nullable(),
    )
    .nullable()
    .optional(),
})

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

  // DEBUG: Log raw user tenants data
  console.log('[getUserTenantData] DEBUG raw user data', {
    userEmail: req.user?.email,
    userTenants: req.user?.tenants,
    userTenantsType: typeof req.user?.tenants,
    userTenantsIsArray: Array.isArray(req.user?.tenants),
  })

  const parsed = userWithTenantRolesSchema.safeParse(req.user)
  if (!parsed.success || !parsed.data.tenants) {
    console.log('[getUserTenantData] DEBUG parse failed or no tenants', {
      parseSuccess: parsed.success,
      parseError: !parsed.success ? parsed.error.message : null,
    })
    return result
  }

  for (const entry of parsed.data.tenants) {
    if (!entry) continue

    const tenantId = normalizeTenantId(entry.tenant)
    if (tenantId !== undefined) {
      result.allTenantIds.push(tenantId)
    }

    // DEBUG: Log each tenant entry
    console.log('[getUserTenantData] DEBUG tenant entry', {
      entry,
      tenantId,
      roles: entry.roles,
    })

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

  // DEBUG: Log final result
  console.log('[getUserTenantData] DEBUG final result', result)

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

    if (tenant && Array.isArray(tenant.allowPublicRead)) {
      return tenant.allowPublicRead
    }
    return null
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
  if (!isTopLevelUserInline(req.user)) {
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
