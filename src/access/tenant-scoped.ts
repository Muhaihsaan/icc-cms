import type { Access, Where } from 'payload'
import type { AccessArgs } from 'payload'

import {
  getUserTenantData,
  getTenantAllowedCollections,
  getTenantAllowPublicRead,
  getTenantFromReq,
  normalizeTenantId,
  isCollectionAllowed,
} from '@/access/helpers'
import { isTopLevelUser } from '@/access/role-checks'
import type { TenantManagedCollection } from '@/config'
import { Collections } from '@/config'
import { DocStatus } from '@/config'

// Where clause that matches nothing (returns empty results gracefully).
export const whereNoAccess: Where = { id: { in: [] } }

// Helper to create tenant-scoped where clause
export const whereTenantScoped = (tenantIds: Array<string | number>): Where => {
  return {
    and: [{ tenant: { in: tenantIds } }, { deletedAt: { exists: false } }],
  }
}

// Check whether the current tenant can access a given collection.
export const isTenantCollectionAllowed = async ({
  req,
  collection,
}: {
  req: AccessArgs['req']
  collection: TenantManagedCollection
}): Promise<boolean> => {
  const tenantData = getUserTenantData(req)

  // Guest writers can only access Posts
  if (tenantData.hasGuestWriterRole) return collection === Collections.POSTS

  // Resolve tenant ID
  let tenantId = normalizeTenantId(getTenantFromReq(req))

  // Top-level users must select a tenant first
  if (isTopLevelUser(req.user)) {
    if (!tenantId) return false
    const allowedCollections = await getTenantAllowedCollections(req, tenantId)
    return isCollectionAllowed(allowedCollections, collection)
  }

  // For tenant users without cookie, resolve from their assigned tenant
  if (!tenantId && tenantData.allTenantIds.length === 1) {
    tenantId = tenantData.allTenantIds[0]
  }

  // No tenant resolved - allow if user is authenticated with tenant assignments
  if (!tenantId) return Boolean(req.user && tenantData.allTenantIds.length > 0)

  const allowedCollections = await getTenantAllowedCollections(req, tenantId)
  return isCollectionAllowed(allowedCollections, collection)
}

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
// Note: Dashboard visibility is controlled by admin.hidden using shouldHideCollection().
export const tenantCollectionAdminAccess =
  (collection: TenantManagedCollection) =>
  async ({ req }: { req: AccessArgs['req'] }) => {
    const tenantData = getUserTenantData(req)

    // Guest writers can only access Posts collection
    if (tenantData.hasGuestWriterRole) {
      return collection === Collections.POSTS
    }

    // Get tenant ID from cookie or user's tenants array
    let tenantId = normalizeTenantId(getTenantFromReq(req))

    // For tenant users without cookie, resolve from their assigned tenant
    if (!tenantId && !isTopLevelUser(req.user) && tenantData.allTenantIds.length === 1) {
      tenantId = tenantData.allTenantIds[0]
    }

    // Top-level users with NO tenant selected = show all (top-level mode)
    if (isTopLevelUser(req.user) && !tenantId) {
      return true
    }

    // No tenant resolved = deny access
    if (!tenantId) return false

    // Check allowedCollections
    const allowedCollections = await getTenantAllowedCollections(req, tenantId)
    return isCollectionAllowed(allowedCollections, collection)
  }

// Allow read access to tenant-scoped documents for tenant members.
// Top-level users have full read access (tenant selection only scopes list view, not individual docs).
// Tenant-level users have deletedAt filter so they cannot see trashed items.
export const tenantMemberReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users have full read access
  // This allows them to access trashed items and items from any tenant
  if (isTopLevelUser(user)) return true

  // Tenant-level users: filter out trashed items
  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole || tenantData.hasTenantUserRole || tenantData.hasGuestWriterRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }
  return false
}

// Allow update access to tenant-scoped documents for tenant admins, super-admins, and super-editors.
// Top-level users have full update access (allows restoring trashed items).
// Tenant-level users have deletedAt filter so they cannot modify trashed items.
export const tenantAdminUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users have full update access
  // This allows them to restore trashed items and update items from any tenant
  if (isTopLevelUser(user)) return true

  // Tenant-level users: filter out trashed items
  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }
  return false
}

// Allow public read for tenant content when the tenant allows it for the specific collection.
export const tenantPublicReadAccess =
  (
    collection: TenantManagedCollection,
    { publishedOnly = false }: { publishedOnly?: boolean } = {},
  ): Access =>
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
        ...(publishedOnly ? [{ _status: { equals: DocStatus.PUBLISHED } }] : []),
      ],
    }

    return where
  }
