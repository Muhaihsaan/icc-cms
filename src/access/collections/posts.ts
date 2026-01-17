import type { Access, Where } from 'payload'
import { z } from 'zod'

import { getUserTenantData, getTenantFromReq, normalizeTenantId } from '@/access/helpers'
import { isTopLevelUser } from '@/access/role-checks'
import { whereTenantScoped } from '@/access/tenant-scoped'
import { Collections } from '@/config/collections'
import { DocStatus } from '@/config/doc-status'

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

  // Use guestWriterPostLimit from req.user directly instead of DB fetch
  const parsed = guestWriterLimitSchema.safeParse(user)
  const limit = parsed.success ? parsed.data.guestWriterPostLimit : 1
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
