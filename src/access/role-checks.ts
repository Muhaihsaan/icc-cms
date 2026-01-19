import type { Access, FieldAccess } from 'payload'
import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { getUserTenantData, hasGuestWriterRole } from '@/access/helpers'
import { Roles } from '@/access/helpers'
import { Collections } from '@/config'

// Check whether a user has the super-admin role.
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.roles === Roles.superAdmin
}

// Check whether a user has the super-editor role.
export const isSuperEditor = (user: User | null): boolean => {
  return user?.roles === Roles.superEditor
}

// Check if user is a top-level user (super-admin or super-editor)
export const isTopLevelUser = (user: User | null): boolean => {
  return isSuperAdmin(user) || isSuperEditor(user)
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
export const isSuperAdminOrBootstrapFieldAccess: FieldAccess = async ({
  req,
}): Promise<boolean> => {
  if (isSuperAdmin(req.user)) return true

  // Allow during first user creation (no users exist)
  if (!req.user) {
    const existingUsers = await req.payload.find({
      collection: Collections.USERS,
      depth: 0,
      limit: 1,
    })
    return existingUsers.totalDocs === 0
  }

  return false
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

// Allow admin panel access for users who can manage content.
// This includes guest-writers who need access to create posts.
export const hasAdminPanelAccess = ({ req }: AccessArgs): boolean => {
  if (isSuperAdmin(req.user)) return true
  if (isSuperEditor(req.user)) return true
  const tenantData = getUserTenantData(req)
  return tenantData.hasAdminRole || tenantData.hasGuestWriterRole
}

// Control visibility of Users collection in admin.
// Guest-writers should NOT see Users collection.
export const usersCollectionAdminAccess = ({ req }: AccessArgs): boolean => {
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

// Field access that denies guest writers - used for fields they shouldn't modify
export const notGuestWriterFieldAccess: FieldAccess = ({ req }) => {
  const user = req.user
  if (!user) return false
  return !hasGuestWriterRole(user)
}
