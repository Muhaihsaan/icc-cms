import type { FieldAccess } from 'payload'

import { hasGuestWriterRole } from '@/access/helpers'

// Field access that denies guest writers - used for fields they shouldn't modify
export const notGuestWriterFieldAccess: FieldAccess = ({ req }) => {
  const user = req.user
  if (!user) return false
  return !hasGuestWriterRole(user)
}
