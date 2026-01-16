import type { Access, FieldAccess, Where } from 'payload'
import type { AccessArgs } from 'payload'
import { z } from 'zod'

import type { User } from '@/payload-types'
import { getTenantFromReq, normalizeTenantId } from '@/access/helpers'

const guestWriterLimitSchema = z.object({
  guestWriterPostLimit: z.number(),
})

type isAuthenticated = (args: AccessArgs<User>) => boolean

export const Roles = {
  superAdmin: 'super-admin',
  superEditor: 'super-editor',
  tenantAdmin: 'tenant-admin',
  tenantViewer: 'tenant-viewer',
  guestWriter: 'guest-writer',
} as const

// Per-request cache for user tenant role data
const USER_TENANT_CACHE_KEY = Symbol('userTenantRoleCache')

type UserTenantData = {
  allTenantIds: Array<string | number>
  adminTenantIds: Array<string | number>
  hasAdminRole: boolean
  hasViewerRole: boolean
  hasGuestWriterRole: boolean
  hasAnyRole: boolean
}

type ReqWithUserTenantCache = AccessArgs['req'] & {
  [USER_TENANT_CACHE_KEY]?: UserTenantData
}

// Compute all user tenant data in a single loop and cache it per-request
const getUserTenantData = (req: ReqWithUserTenantCache): UserTenantData => {
  // Return cached result if available
  if (req[USER_TENANT_CACHE_KEY]) {
    return req[USER_TENANT_CACHE_KEY]
  }

  const result: UserTenantData = {
    allTenantIds: [],
    adminTenantIds: [],
    hasAdminRole: false,
    hasViewerRole: false,
    hasGuestWriterRole: false,
    hasAnyRole: false,
  }

  const user = req.user
  if (!user?.tenants) {
    req[USER_TENANT_CACHE_KEY] = result
    return result
  }

  for (const entry of user.tenants) {
    if (!entry) continue

    // Extract tenant ID
    const tenantId = normalizeTenantId(entry.tenant)
    if (tenantId !== undefined) {
      result.allTenantIds.push(tenantId)
    }

    // Check roles
    if (!Array.isArray(entry.roles)) continue
    if (entry.roles.length > 0) result.hasAnyRole = true

    if (entry.roles.includes(Roles.tenantAdmin)) {
      result.hasAdminRole = true
      if (tenantId !== undefined) result.adminTenantIds.push(tenantId)
    }
    if (entry.roles.includes(Roles.tenantViewer)) {
      result.hasViewerRole = true
    }
    if (entry.roles.includes(Roles.guestWriter)) {
      result.hasGuestWriterRole = true
    }
  }

  // Cache the result
  req[USER_TENANT_CACHE_KEY] = result
  return result
}

// Collections that can be toggled per tenant.
export const tenantManagedCollections = [
  'pages',
  'posts',
  'media',
  'categories',
  'header',
  'footer',
] as const

type TenantManagedCollection = (typeof tenantManagedCollections)[number]

// Allow access to any request.
export const anyone: Access = () => true

// Allow access only when a user is authenticated.
export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return Boolean(user)
}

// Allow access for authenticated users or published content for public requests.
export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}

// Allow collection access only for super-admin users.
export const isSuperAdminAccess: Access = ({ req }): boolean => {
  return isSuperAdmin(req.user)
}

// Allow field access only for super-admin users.
export const isSuperAdminFieldAccess: FieldAccess = ({ req }): boolean => {
  return isSuperAdmin(req.user)
}

// Allow field access for super-admin or during first user creation (bootstrap).
export const isSuperAdminOrBootstrapFieldAccess: FieldAccess = async ({ req }): Promise<boolean> => {
  if (isSuperAdmin(req.user)) return true

  // Allow during first user creation (no users exist)
  if (!req.user) {
    const existingUsers = await req.payload.find({
      collection: 'users',
      depth: 0,
      limit: 1,
    })
    return existingUsers.totalDocs === 0
  }

  return false
}

// Check whether a user has the super-admin role.
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.roles === Roles.superAdmin
}

// Check whether a user has the super-editor role.
export const isSuperEditor = (user: User | null): boolean => {
  return user?.roles === Roles.superEditor
}

// True if the user is a super-admin or has any tenant role.
export const isSuperAdminOrTenantMember = ({ req }: AccessArgs): boolean => {
  if (isSuperAdmin(req.user)) return true
  const tenantData = getUserTenantData(req)
  return tenantData.hasAnyRole
}

// Allow access for super-admins, super-editors, or tenant admins.
export const isSuperAdminOrEditor = ({ req }: AccessArgs): boolean => {
  if (isSuperAdmin(req.user)) return true
  if (isSuperEditor(req.user)) return true
  const tenantData = getUserTenantData(req)
  return tenantData.hasAdminRole
}

// Allow field access for super-admins, super-editors, or tenant admins.
export const isSuperAdminOrEditorFieldAccess: FieldAccess = ({ req }): boolean => {
  if (isSuperAdmin(req.user)) return true
  if (isSuperEditor(req.user)) return true
  const tenantData = getUserTenantData(req)
  return tenantData.hasAdminRole
}

// Allow reading users.
// Top-level users (super-admin/super-editor) see ALL users.
// Tenant-admins see only users within their tenant(s).
export const usersReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users see all users
  if (isTopLevelUser(user)) return true

  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    return {
      and: [{ 'tenants.tenant': { in: tenantData.allTenantIds } }, { deletedAt: { exists: false } }],
    }
  }

  return false
}

// Per-request cache key for tenant allowed collections
const TENANT_CACHE_KEY = Symbol('tenantAllowedCollectionsCache')

type ReqWithCache = AccessArgs['req'] & {
  [TENANT_CACHE_KEY]?: Map<string | number, TenantManagedCollection[] | null | undefined>
}

// Read the allowed collections for a tenant. Returns null when not set.
// Uses per-request caching to avoid repeated DB calls within the same request.
const getTenantAllowedCollections = async (
  req: ReqWithCache,
  tenantId: string | number,
): Promise<TenantManagedCollection[] | null | undefined> => {
  // Initialize cache on first call
  if (!req[TENANT_CACHE_KEY]) {
    req[TENANT_CACHE_KEY] = new Map()
  }

  // Return cached result if available
  if (req[TENANT_CACHE_KEY].has(tenantId)) {
    return req[TENANT_CACHE_KEY].get(tenantId)
  }

  let result: TenantManagedCollection[] | null | undefined
  try {
    const tenant = await req.payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })

    if (!tenant) {
      result = undefined
    } else if (!Array.isArray(tenant.allowedCollections)) {
      result = null
    } else {
      result = tenant.allowedCollections
    }
  } catch {
    result = undefined
  }

  // Cache the result
  req[TENANT_CACHE_KEY].set(tenantId, result)
  return result
}

// Check if user is a top-level user (super-admin or super-editor)
const isTopLevelUser = (user: User | null): boolean => {
  return isSuperAdmin(user) || isSuperEditor(user)
}

// Check whether the current tenant can access a given collection.
const isTenantCollectionAllowed = async ({
  req,
  collection,
}: {
  req: AccessArgs['req']
  collection: TenantManagedCollection
}): Promise<boolean> => {
  const tenantId = normalizeTenantId(getTenantFromReq(req))

  // Top-level users must select a tenant first
  if (isTopLevelUser(req.user)) {
    if (!tenantId) return false
    const allowedCollections = await getTenantAllowedCollections(req, tenantId)
    // Tenant not found or no allowed collections configured
    if (!allowedCollections || allowedCollections.length === 0) return false
    return allowedCollections.includes(collection)
  }

  const tenantData = getUserTenantData(req)
  if (tenantData.hasGuestWriterRole) return collection === 'posts'

  let resolvedTenantId = tenantId
  if (!resolvedTenantId && tenantData.allTenantIds.length === 1) {
    resolvedTenantId = tenantData.allTenantIds[0]
  }

  // Only allow if user is authenticated and has tenant assignments
  if (!resolvedTenantId) return Boolean(req.user && tenantData.allTenantIds.length > 0)

  const allowedCollections = await getTenantAllowedCollections(req, resolvedTenantId)
  // Tenant not found or no allowed collections configured
  if (!allowedCollections || allowedCollections.length === 0) return false

  return allowedCollections.includes(collection)
}

// Where clause that matches nothing (returns empty results gracefully).
const whereNoAccess: Where = { id: { in: [] } }

// Wrap an access function with tenant collection checks.
export const withTenantCollectionAccess = (
  collection: TenantManagedCollection,
  access: Access,
): Access => {
  return async (args) => {
    const allowed = await isTenantCollectionAllowed({ req: args.req, collection })
    // Return empty results instead of hard error when collection not allowed
    if (!allowed) return whereNoAccess
    return access(args)
  }
}

// Allow admin UI access based on allowed collections.
// Top-level users always see all collections (tenant requirement enforced on actual operations).
export const tenantCollectionAdminAccess =
  (collection: TenantManagedCollection) =>
  async ({ req }: { req: AccessArgs['req'] }) => {
    // Top-level users can always see collections in admin UI
    if (isTopLevelUser(req.user)) return true
    return isTenantCollectionAllowed({ req, collection })
  }

// Allow reading tenants scoped to tenant assignments, with full access for super-admins and super-editors.
export const tenantsReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (isSuperEditor(user)) return true

  const tenantData = getUserTenantData(req)
  if (tenantData.allTenantIds.length === 0) return false

  return {
    id: { in: tenantData.allTenantIds },
  }
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

// Per-request cache key for tenant public read settings
const TENANT_PUBLIC_READ_CACHE_KEY = Symbol('tenantPublicReadCache')

type ReqWithPublicReadCache = AccessArgs['req'] & {
  [TENANT_PUBLIC_READ_CACHE_KEY]?: Map<string | number, string[] | null>
}

// Fetch which collections allow public read for a tenant.
// Uses per-request caching to avoid repeated DB calls within the same request.
const getTenantAllowPublicRead = async ({
  req,
  tenantId,
}: {
  req: ReqWithPublicReadCache
  tenantId: string | number
}): Promise<string[] | null> => {
  // Initialize cache on first call
  if (!req[TENANT_PUBLIC_READ_CACHE_KEY]) {
    req[TENANT_PUBLIC_READ_CACHE_KEY] = new Map()
  }

  // Return cached result if available
  if (req[TENANT_PUBLIC_READ_CACHE_KEY].has(tenantId)) {
    return req[TENANT_PUBLIC_READ_CACHE_KEY].get(tenantId) ?? null
  }

  let result: string[] | null = null
  try {
    const tenant = await req.payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })

    if (tenant && Array.isArray(tenant.allowPublicRead)) {
      result = tenant.allowPublicRead
    }
  } catch {
    result = null
  }

  // Cache the result
  req[TENANT_PUBLIC_READ_CACHE_KEY].set(tenantId, result)
  return result
}

const whereTenantScoped = (tenantIds: Array<string | number>): Where => {
  return {
    and: [{ tenant: { in: tenantIds } }, { deletedAt: { exists: false } }],
  }
}

// Allow read access to tenant-scoped documents for tenant members.
// Top-level users can see all documents, scoped to selected tenant if one is chosen.
export const tenantMemberReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users can always read - scoped to tenant if selected
  if (isTopLevelUser(user)) {
    const tenantId = normalizeTenantId(getTenantFromReq(req))
    if (!tenantId) return true // No tenant selected = see all (collection visible in nav)
    return { and: [{ tenant: { equals: tenantId } }, { deletedAt: { exists: false } }] }
  }

  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole || tenantData.hasViewerRole || tenantData.hasGuestWriterRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }
  return false
}

// Allow update access to tenant-scoped documents for tenant admins, super-admins, and super-editors.
// Top-level users must select a tenant first.
export const tenantAdminUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users must select a tenant first
  if (isTopLevelUser(user)) {
    const tenantId = normalizeTenantId(getTenantFromReq(req))
    if (!tenantId) return false
    return { and: [{ tenant: { equals: tenantId } }, { deletedAt: { exists: false } }] }
  }

  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }
  return false
}

// Allow public read for tenant content when the tenant allows it for the specific collection.
export const tenantPublicReadAccess =
  (collection: TenantManagedCollection, { publishedOnly = false }: { publishedOnly?: boolean } = {}): Access =>
  async ({ req }) => {
    if (req.user) {
      return tenantMemberReadAccess({ req })
    }

    const tenantId = normalizeTenantId(getTenantFromReq(req))
    if (!tenantId) return false

    const allowedPublicCollections = await getTenantAllowPublicRead({ req, tenantId })
    // Empty or null = no public read allowed
    if (!allowedPublicCollections || !allowedPublicCollections.includes(collection)) return false

    const where: Where = {
      and: [
        { tenant: { equals: tenantId } },
        { deletedAt: { exists: false } },
        ...(publishedOnly ? [{ _status: { equals: 'published' } }] : []),
      ],
    }

    return where
  }

// Allow tenant-admins to create users only within their own tenant.
// Top-level users can create users without tenant selection.
export const usersCreateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users can always create users
  if (isTopLevelUser(user)) return true

  const tenantData = getUserTenantData(req)
  if (!tenantData.hasAdminRole) return false
  if (tenantData.adminTenantIds.length === 0) return false

  // Tenant-admin can create users for their tenant(s)
  const tenantId = normalizeTenantId(getTenantFromReq(req))
  if (tenantId) return tenantData.adminTenantIds.includes(tenantId)

  // If no tenant selected, allow if they have exactly one admin tenant
  return tenantData.adminTenantIds.length === 1
}

// Allow tenant admins and guest writers to create posts with limits.
// Top-level users must select a tenant first.
export const postsCreateAccess: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false

  const tenantId = normalizeTenantId(getTenantFromReq(req))

  // Top-level users must select a tenant first
  if (isTopLevelUser(user)) {
    return Boolean(tenantId)
  }

  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) return true
  if (!tenantData.hasGuestWriterRole) return false

  if (!tenantId) return false
  if (!tenantData.allTenantIds.includes(tenantId)) return false

  // Use guestWriterPostLimit from req.user directly instead of DB fetch
  const parsed = guestWriterLimitSchema.safeParse(user)
  const limit = parsed.success ? parsed.data.guestWriterPostLimit : 1
  if (limit <= 0) return false

  const where: Where = {
    and: [
      { authors: { contains: user.id } },
      {
        or: [{ _status: { equals: 'published' } }, { publishedAt: { exists: true } }],
      },
    ],
  }

  const { totalDocs } = await req.payload.count({
    collection: 'posts',
    overrideAccess: true,
    req: undefined,
    where,
  })

  return totalDocs < limit
}

// Allow tenant admins and guest writers to update posts they authored.
// Top-level users must select a tenant first.
export const postsUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users must select a tenant first
  if (isTopLevelUser(user)) {
    const tenantId = normalizeTenantId(getTenantFromReq(req))
    if (!tenantId) return false
    return { and: [{ tenant: { equals: tenantId } }, { deletedAt: { exists: false } }] }
  }

  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }

  if (!tenantData.hasGuestWriterRole) return false

  const where: Where = {
    and: [{ authors: { contains: user.id } }, { deletedAt: { exists: false } }],
  }
  return where
}

// Temporary Solution for First User Creation
// Allow bootstrapping the very first user without an authenticated session.
export const usersBootstrapCreateAccess: Access = async ({ req }) => {
  if (req.user) {
    return usersCreateAccess({ req })
  }

  const existingUsers = await req.payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
  })

  return existingUsers.totalDocs === 0
}

// Allow super-admins to delete users, but prevent deleting own account.
export const usersDeleteAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (!isSuperAdmin(user)) return false

  // Prevent deleting own account
  return { id: { not_equals: user.id } }
}
