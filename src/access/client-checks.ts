import {
  Roles,
  hasGuestWriterRole,
  userTenantsSchema,
  userWithAllowedCollectionsSchema,
  hiddenArgsSchema,
  tenantIdSchema,
  tenantIdObjectSchema,
  isSuperAdminSchema,
  isSuperEditorSchema,
  isTopLevelUserSchema,
} from '@/access/helpers'

// Re-export for convenience
export { hasGuestWriterRole }

// Zod-based role validators for client-side use (accepts unknown input)
// Named differently from role-checks.ts to avoid confusion:
// - role-checks.ts: isSuperAdmin(user: User | null) - typed, server-side
// - client-checks.ts: validateSuperAdmin(user: unknown) - Zod-based, client-side
export const validateSuperAdmin = isSuperAdminSchema
export const validateSuperEditor = isSuperEditorSchema
export const validateTopLevelUser = isTopLevelUserSchema

const TOP_LEVEL_STORAGE_KEY = 'icc-top-level'

/**
 * Check if collection should be hidden for top-level users in top-level mode.
 * Used by admin.hidden on tenant-scoped collections.
 */
export const shouldHideForTopLevelMode = (user: unknown): boolean => {
  // Non-top-level users always see tenant-scoped collections
  if (!validateTopLevelUser(user)) return false
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
  const directParsed = tenantIdSchema.safeParse(tenant)
  if (directParsed.success) return directParsed.data

  const objParsed = tenantIdObjectSchema.safeParse(tenant)
  if (objParsed.success) return objParsed.data.id

  return undefined
}

/**
 * Check if Users collection should be hidden.
 * Only guest writers should have Users hidden - all other roles can see it.
 */
export const shouldHideUsersCollection = (args: unknown): boolean => {
  const argsResult = hiddenArgsSchema.safeParse(args)
  const user = argsResult.success ? argsResult.data.user : args

  // Top-level users always see Users
  if (validateTopLevelUser(user)) return false

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
  if (validateTopLevelUser(user)) {
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
