import type { Access, Where } from 'payload'

import { getUserTenantData, getEffectiveTenant } from '@/access/helpers'
import { isSuperAdmin, isTopLevelUser } from '@/access/role-checks'
import { Roles } from '@/access/roles'
import { Collections } from '@/config/collections'

// Allow reading users scoped to their tenant or role level.
// Top-level users with no tenant selected see only top-level users.
// Top-level users with tenant selected see that tenant's users.
// No deletedAt filter for top-level users so they can access Trash tab.
// Tenant-level users have deletedAt filter so they cannot see trashed users.
export const usersReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users: scoped by tenant selection, no deletedAt filter
  if (isTopLevelUser(user)) {
    const tenantId = getEffectiveTenant(req)
    // DEBUG: Remove after fixing
    console.log('[usersReadAccess] tenantId:', tenantId, 'type:', typeof tenantId)
    if (tenantId) {
      // Tenant selected: show that tenant's users
      const query = { 'tenants.tenant': { equals: tenantId } }
      console.log('[usersReadAccess] query:', JSON.stringify(query))
      return query
    }
    // No tenant selected (Top Level mode): show only top-level users
    return {
      or: [{ roles: { equals: Roles.superAdmin } }, { roles: { equals: Roles.superEditor } }],
    }
  }

  // Tenant-level users: filter out trashed users
  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    const where: Where = {
      and: [
        { 'tenants.tenant': { in: tenantData.allTenantIds } },
        { deletedAt: { exists: false } },
      ],
    }
    return where
  }
  return false
}

// Allow updating users.
// Top-level users (super-admin/super-editor) can update ALL users.
// Tenant-admins can only update users within their tenant(s).
export const usersUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users can update all users
  if (isTopLevelUser(user)) return true

  const tenantData = getUserTenantData(req)
  if (tenantData.hasAdminRole) {
    const where: Where = {
      and: [
        { 'tenants.tenant': { in: tenantData.allTenantIds } },
        { deletedAt: { exists: false } },
      ],
    }
    return where
  }

  return false
}

// Allow tenant-admins to create users only within their own tenant.
// Top-level users can create users without tenant selection.
export const usersCreateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false

  // Top-level users can always create users
  if (isTopLevelUser(user)) return true

  const tenantData = getUserTenantData(req)
  if (!tenantData.hasAdminRole) return false
  if (tenantData.adminTenantIds.length === 0) return false

  // Tenant-admin can create users for their tenant(s)
  const tenantId = getEffectiveTenant(req)
  if (tenantId) return tenantData.adminTenantIds.includes(tenantId)

  // If no tenant selected, allow if they have exactly one admin tenant
  return tenantData.adminTenantIds.length === 1
}

// Temporary Solution for First User Creation
// Allow bootstrapping the very first user without an authenticated session.
export const usersBootstrapCreateAccess: Access = async ({ req }) => {
  if (req.user) {
    return usersCreateAccess({ req })
  }

  const existingUsers = await req.payload.find({
    collection: Collections.USERS,
    depth: 0,
    limit: 1,
  })

  return existingUsers.totalDocs === 0
}

// Allow super-admins to delete users, but prevent deleting own account.
export const usersDeleteAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (!isSuperAdmin(user)) return false

  // Prevent deleting own account
  return { id: { not_equals: user.id } }
}
