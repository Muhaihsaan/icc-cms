import type { CollectionAfterChangeHook } from 'payload'

import { Collections } from '@/config'
import { Roles } from '@/access/helpers'

// Verify that only one super-admin exists after bootstrap.
// This handles race conditions where multiple simultaneous requests
// could both create super-admin users during first-time setup.
export const verifyOnlySuperAdmin: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  // Only check on create operations
  if (operation !== 'create') return doc

  // Only check during bootstrap (no logged-in user)
  // Normal user creation by admins doesn't have this race condition
  if (req.user) return doc

  // Only check if this user was created as super-admin
  if (doc.roles !== Roles.superAdmin) return doc

  // Count all super-admins
  const superAdmins = await req.payload.find({
    collection: Collections.USERS,
    where: { roles: { equals: Roles.superAdmin } },
    limit: 2,
    depth: 0,
    overrideAccess: true,
  })

  // If more than one super-admin exists, this is a race condition
  // The first created (lower ID or earlier createdAt) should remain super-admin
  if (superAdmins.totalDocs > 1) {
    // Sort by createdAt to find the first one
    const sorted = superAdmins.docs.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateA - dateB
    })

    const firstSuperAdmin = sorted[0]

    // If this doc is NOT the first super-admin, downgrade it
    if (firstSuperAdmin && doc.id !== firstSuperAdmin.id) {
      req.payload.logger.warn(
        `Race condition detected: Multiple super-admins created. Downgrading user ${doc.id} to null role.`,
      )

      await req.payload.update({
        collection: Collections.USERS,
        id: doc.id,
        data: { roles: null },
        overrideAccess: true,
      })

      return { ...doc, roles: null }
    }
  }

  return doc
}
