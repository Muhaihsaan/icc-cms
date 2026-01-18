import type { CollectionBeforeDeleteHook } from 'payload'

import { Collections } from '@/config/collections'
import { isSuperAdmin, Roles } from '@/access'

// Prevent deletion of the last super-admin account
export const preventLastSuperAdminDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const userToDelete = await req.payload.findByID({
    collection: Collections.USERS,
    id,
    depth: 0,
  })

  if (!isSuperAdmin(userToDelete)) return

  const superAdmins = await req.payload.find({
    collection: Collections.USERS,
    where: {
      roles: { equals: Roles.superAdmin },
    },
    limit: 1,
  })

  if (superAdmins.totalDocs <= 1) {
    throw new Error('Cannot delete the last super-admin.')
  }
}
