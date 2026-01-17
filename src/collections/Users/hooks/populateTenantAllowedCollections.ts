import type { CollectionAfterReadHook } from 'payload'
import type { User } from '@/payload-types'
import { Collections } from '@/config/collections'

/**
 * Populates allowedCollections from the tenant into the user's tenant entry.
 * This allows client-side code (like admin.hidden) to check allowedCollections synchronously.
 */
export const populateTenantAllowedCollections: CollectionAfterReadHook<User> = async ({
  doc,
  req,
}) => {
  if (!doc.tenants || doc.tenants.length === 0) {
    return doc
  }

  const populatedTenants = await Promise.all(
    doc.tenants.map(async (entry) => {
      if (!entry || !entry.tenant) return entry

      // Get tenant ID whether it's a number/string or populated object
      const tenantId =
        typeof entry.tenant === 'object' && 'id' in entry.tenant
          ? entry.tenant.id
          : entry.tenant

      if (!tenantId) return entry

      try {
        const tenant = await req.payload.findByID({
          collection: Collections.TENANTS,
          id: tenantId,
          depth: 0,
          overrideAccess: true,
        })

        if (tenant && Array.isArray(tenant.allowedCollections)) {
          return {
            ...entry,
            allowedCollections: tenant.allowedCollections,
          }
        }
      } catch {
        // Tenant not found or error - return entry as-is
      }

      return entry
    }),
  )

  return {
    ...doc,
    tenants: populatedTenants,
  }
}
