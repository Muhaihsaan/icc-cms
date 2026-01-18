import type { CollectionBeforeChangeHook } from 'payload'

import { Collections } from '@/config'
import { Roles } from '@/access/roles'

// Ensure the first user created is always a super-admin
export const ensureFirstUserSuperAdmin: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data
  if (req.user) return data // Already has a logged-in user

  const existingUsers = await req.payload.find({
    collection: Collections.USERS,
    depth: 0,
    limit: 1,
  })

  // First user must be super-admin
  if (existingUsers.totalDocs === 0) {
    return { ...data, roles: Roles.superAdmin }
  }

  return data
}
