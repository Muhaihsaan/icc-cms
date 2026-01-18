import { z } from 'zod'

import { Roles } from '@/access/roles'
import { hasGuestWriterRole } from '@/access/helpers'

// Re-export for convenience
export { hasGuestWriterRole }

// Schema for validating user roles field
const userRolesSchema = z.object({
  roles: z.string().nullable().optional(),
})

// Schema for validating user tenants with roles
const tenantEntrySchema = z.object({
  tenant: z.union([z.string(), z.number(), z.object({ id: z.union([z.string(), z.number()]) })]),
  roles: z.array(z.string()).nullable().optional(),
})

const userTenantsSchema = z.object({
  tenants: z.array(tenantEntrySchema).nullable().optional(),
})

export const isSuperAdmin = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superAdmin
}

export const isSuperEditor = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superEditor
}

export const isTopLevelUser = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  const roles = parsed.data.roles
  if (!roles) return false
  return roles === Roles.superAdmin || roles === Roles.superEditor
}

const TOP_LEVEL_STORAGE_KEY = 'icc-top-level'

/**
 * Check if collection should be hidden for top-level users in top-level mode.
 * Used by admin.hidden on tenant-scoped collections.
 */
export const shouldHideForTopLevelMode = (user: unknown): boolean => {
  // Non-top-level users always see tenant-scoped collections
  if (!isTopLevelUser(user)) return false
  // Server-side: can't check localStorage, don't hide
  if (typeof window === 'undefined') return false
  // Client-side: check localStorage for top-level mode
  return localStorage.getItem(TOP_LEVEL_STORAGE_KEY) === 'true'
}

export const getTenantAdminTenantId = (user: unknown): string | number | undefined => {
  const parsed = userTenantsSchema.safeParse(user)
  if (!parsed.success) return undefined

  const tenants = parsed.data.tenants
  if (!tenants || tenants.length !== 1) return undefined

  const entry = tenants[0]
  if (!entry) return undefined

  const roles = entry.roles
  if (!roles || !roles.includes(Roles.tenantAdmin)) return undefined

  const tenant = entry.tenant
  const tenantIdSchema = z.union([z.string(), z.number()])
  const directParsed = tenantIdSchema.safeParse(tenant)
  if (directParsed.success) return directParsed.data

  const objSchema = z.object({ id: tenantIdSchema })
  const objParsed = objSchema.safeParse(tenant)
  if (objParsed.success) return objParsed.data.id

  return undefined
}

// Schema for tenant entry with allowedCollections (populated by afterRead hook)
const tenantEntryWithAllowedSchema = z.object({
  tenant: z.union([z.string(), z.number(), z.object({ id: z.union([z.string(), z.number()]) })]),
  roles: z.array(z.string()).nullable().optional(),
  allowedCollections: z.array(z.string()).nullable().optional(),
})

const userWithAllowedCollectionsSchema = z.object({
  tenants: z.array(tenantEntryWithAllowedSchema).nullable().optional(),
})

// Schema for the args object passed to admin.hidden: { user: User }
const hiddenArgsSchema = z.object({
  user: userWithAllowedCollectionsSchema.nullable(),
})

/**
 * Check if Users collection should be hidden.
 * Only guest writers should have Users hidden - all other roles can see it.
 */
export const shouldHideUsersCollection = (args: unknown): boolean => {
  const argsResult = hiddenArgsSchema.safeParse(args)
  const user = argsResult.success ? argsResult.data.user : args

  // Top-level users always see Users
  if (isTopLevelUser(user)) return false

  // Guest writers should NOT see Users collection
  if (hasGuestWriterRole(user)) return true

  // Tenant admins and tenant users can see Users
  return false
}

/**
 * Check if a collection should be hidden for a tenant user based on allowedCollections.
 * Used by admin.hidden on tenant-scoped collections.
 *
 * @param collection - The collection slug to check
 * @returns A function that takes { user } args and returns true if the collection should be hidden
 */
export const shouldHideCollection = (collection: string) => (args: unknown): boolean => {
  // admin.hidden receives { user } not just user
  const argsResult = hiddenArgsSchema.safeParse(args)
  const user = argsResult.success ? argsResult.data.user : args

  // Top-level users: use existing top-level mode logic (CSS filtering in TenantSelector)
  if (isTopLevelUser(user)) {
    return shouldHideForTopLevelMode(user)
  }

  // Guest writers can only see Posts collection
  if (hasGuestWriterRole(user)) {
    return collection !== 'posts'
  }

  // Tenant users: check allowedCollections from their tenant
  const parsed = userWithAllowedCollectionsSchema.safeParse(user)
  if (!parsed.success) return false

  const tenants = parsed.data.tenants
  if (!tenants || tenants.length === 0) return false

  const entry = tenants[0]
  if (!entry) return false

  const allowedCollections = entry.allowedCollections
  // null/undefined = not configured, don't hide (fail open, show all)
  if (!allowedCollections) return false
  // empty array = explicitly set to none, hide all tenant collections
  if (allowedCollections.length === 0) return true

  // Hide if collection is NOT in allowedCollections
  return !allowedCollections.includes(collection)
}
