import type { Access, FieldAccess } from 'payload'
import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import { getUserTenantData } from '@/access/helpers'
import { Roles } from '@/access/roles'
import { Collections } from '@/config/collections'

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

// Allow admin panel access for any authenticated user with a tenant role.
// This is used for the Users collection access.admin to gate overall admin UI access.
export const hasAdminPanelAccess = ({ req }: AccessArgs): boolean => {
  if (isSuperAdmin(req.user)) return true
  if (isSuperEditor(req.user)) return true
  const tenantData = getUserTenantData(req)
  // Allow any user with a tenant role (admin, viewer, or guest writer)
  return tenantData.hasAnyRole
}

// Allow field access for super-admins, super-editors, or tenant admins.
export const isSuperAdminOrEditorFieldAccess: FieldAccess = ({ req }): boolean => {
  if (isSuperAdmin(req.user)) return true
  if (isSuperEditor(req.user)) return true
  const tenantData = getUserTenantData(req)
  return tenantData.hasAdminRole
}
