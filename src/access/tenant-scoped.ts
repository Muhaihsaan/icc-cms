import type { Access, Where } from 'payload'
import type { AccessArgs } from 'payload'

import {
  getUserTenantData,
  getTenantAllowedCollections,
  getTenantAllowPublicRead,
  getTenantFromReq,
  normalizeTenantId,
} from '@/access/helpers'
import { isTopLevelUser } from '@/access/role-checks'
import type { TenantManagedCollection } from '@/config/tenant-collections'
import { Collections } from '@/config/collections'
import { DocStatus } from '@/config/doc-status'

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
  if (tenantData.hasGuestWriterRole) return collection === Collections.POSTS

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
  if (tenantData.hasAdminRole || tenantData.hasViewerRole || tenantData.hasGuestWriterRole) {
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
