import type { Access, Where } from 'payload'
import { z } from 'zod'

import { getUserTenantData, getTenantFromReq, getTenantAllowPublicRead, normalizeTenantId } from '@/access/helpers'
import { isTopLevelUser } from '@/access/role-checks'
import { whereTenantScoped } from '@/access/tenant-scoped'
import { Collections } from '@/config/collections'
import { DocStatus } from '@/config/doc-status'
import type { TenantManagedCollection } from '@/config/tenant-collections'

const guestWriterLimitSchema = z.object({
  guestWriterPostLimit: z.number(),
})

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

  // Fetch fresh user data from DB to get updated guestWriterPostLimit
  // (session may have stale value if super-admin updated it)
  let limit = 1
  try {
    const freshUser = await req.payload.findByID({
      collection: Collections.USERS,
      id: user.id,
      depth: 0,
      overrideAccess: true,
    })
    const parsed = guestWriterLimitSchema.safeParse(freshUser)
    if (parsed.success) {
      limit = parsed.data.guestWriterPostLimit
    }
  } catch {
    // Fallback to session value if DB fetch fails
    const parsed = guestWriterLimitSchema.safeParse(user)
    if (parsed.success) {
      limit = parsed.data.guestWriterPostLimit
    }
  }

  if (limit <= 0) return false

  const where: Where = {
    and: [
      { authors: { contains: user.id } },
      {
        or: [{ _status: { equals: DocStatus.PUBLISHED } }, { publishedAt: { exists: true } }],
      },
    ],
  }

  const { totalDocs } = await req.payload.count({
    collection: Collections.POSTS,
    overrideAccess: true,
    req: undefined,
    where,
  })

  return totalDocs < limit
}

// Allow tenant admins and guest writers to update posts they authored.
// Top-level users have full update access (allows restoring trashed posts).
// Tenant-level users have deletedAt filter so they cannot modify trashed posts.
export const postsUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users have full update access
  // This allows them to restore trashed posts and update posts from any tenant
  if (isTopLevelUser(user)) return true

  // Tenant-level users: filter out trashed posts
  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }

  if (!tenantData.hasGuestWriterRole) return false

  // Guest writers can only update posts they authored within their tenant(s)
  const where: Where = {
    and: [
      { authors: { contains: user.id } },
      { tenant: { in: tenantData.allTenantIds } },
      { deletedAt: { exists: false } },
    ],
  }
  return where
}

// Allow only tenant admins and top-level users to delete posts.
// Guest writers cannot delete posts - they can only create and update.
export const postsDeleteAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users have full delete access
  if (isTopLevelUser(user)) return true

  // Tenant admins can delete posts within their tenant(s)
  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    return whereTenantScoped(tenantData.allTenantIds)
  }

  // Guest writers cannot delete posts
  return false
}

// Allow reading posts with special handling for guest writers.
// - Public users: published posts from tenants that allow public read
// - Top-level users: full access
// - Tenant admins/viewers: tenant-scoped access
// - Guest writers: only their own posts (filtered by authors field)
export const postsReadAccess =
  (
    collection: TenantManagedCollection,
    { publishedOnly = false }: { publishedOnly?: boolean } = {},
  ): Access =>
  async ({ req }) => {
    const { user } = req

    // Public access (no user)
    if (!user) {
      const tenantId = normalizeTenantId(getTenantFromReq(req))
      if (!tenantId) return false

      const allowedPublicCollections = await getTenantAllowPublicRead({ req, tenantId })
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

    // Top-level users have full read access
    if (isTopLevelUser(user)) return true

    const tenantData = getUserTenantData(req)

    // Tenant admins and viewers: tenant-scoped access
    if (tenantData.hasAdminRole || tenantData.hasViewerRole) {
      return whereTenantScoped(tenantData.allTenantIds)
    }

    // Guest writers: can only see their own posts (regardless of publish status)
    if (tenantData.hasGuestWriterRole) {
      const where: Where = {
        and: [
          { authors: { contains: user.id } },
          { tenant: { in: tenantData.allTenantIds } },
          { deletedAt: { exists: false } },
          // No publishedOnly filter - guest writers see their own drafts
        ],
      }
      return where
    }

    return false
  }
