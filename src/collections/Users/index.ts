import type { ArrayField, CollectionConfig, Where } from 'payload'

import {
  getEffectiveTenant,
  hasAdminPanelAccess,
  isSuperAdmin,
  isSuperAdminFieldAccess,
  isSuperAdminOrBootstrapFieldAccess,
  isSuperAdminOrEditorFieldAccess,
  isTopLevelUser,
  Roles,
  usersBootstrapCreateAccess,
  usersDeleteAccess,
  usersReadAccess,
  usersUpdateAccess,
  shouldHideUsersCollection,
} from '@/access'
import { Collections } from '@/config'
import { assignUsersToOneTenant } from './hooks/assign-users-to-one-tenant'
import { setCookieBasedOnDomain } from './hooks/set-cookie-based-on-domain'
import { populateTenantAllowedCollections } from './hooks/populate-tenant-allowed-collections'
import { ensureFirstUserSuperAdmin } from './hooks/ensure-first-user-super-admin'
import { preventLastSuperAdminDelete } from './hooks/prevent-last-super-admin-delete'
import { verifyOnlySuperAdmin } from './hooks/verify-only-super-admin'
import { validateTenantsField, showGuestWriterPostLimit } from './hooks/validators'

// Define tenants field manually to control validation during bootstrap
const tenantsField: ArrayField = {
  name: 'tenants',
  type: 'array',
  label: 'Assigned Tenants',
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: Collections.TENANTS,
      required: false,
    },
    {
      name: 'roles',
      type: 'select',
      defaultValue: [Roles.tenantUser],
      hasMany: true,
      required: false,
      options: [Roles.tenantAdmin, Roles.tenantUser, Roles.guestWriter],
      access: {
        update: isSuperAdminFieldAccess,
      },
    },
  ],
}

export const Users: CollectionConfig = {
  slug: 'users',
  trash: true,
  access: {
    admin: hasAdminPanelAccess,
    create: usersBootstrapCreateAccess,
    delete: usersDeleteAccess,
    update: usersUpdateAccess,
    read: usersReadAccess,
  },
  admin: {
    group: 'Administrative',
    // Hide Users collection from guest writers (they can access admin but shouldn't see Users)
    hidden: shouldHideUsersCollection,
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
    baseListFilter: ({ req }): Where => {
      const tenantId = getEffectiveTenant(req)

      // Tenant scope: show only users belonging to this tenant
      if (tenantId) {
        return {
          'tenants.tenant': { equals: tenantId },
        }
      }

      // Top-level scope: show only super-admin and super-editor users
      return {
        roles: { in: [Roles.superAdmin, Roles.superEditor] },
      }
    },
  },
  auth: true,
  fields: [
    {
      name: 'roleSelector',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (_data, _siblingData, { user }) => isTopLevelUser(user),
        components: {
          Field: '@/components/UserRoleField/user-role-field',
        },
      },
    },
    {
      admin: {
        position: 'sidebar',
        hidden: true, // Hidden - managed by UserRoleField component
      },
      name: 'roles',
      type: 'select',
      index: true,
      options: [Roles.superAdmin, Roles.superEditor],
      // No defaultValue - first user logic handled in beforeChange hook
      // Tenant users should have roles: null
      access: {
        create: isSuperAdminOrBootstrapFieldAccess,
        update: isSuperAdminFieldAccess,
        // Read allowed for all authenticated users so filtering works
        read: ({ req }) => Boolean(req.user),
      },
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'guestWriterPostLimit',
      type: 'number',
      min: 0,
      access: {
        create: isSuperAdminFieldAccess,
        update: isSuperAdminFieldAccess,
        // Allow super-admins to read any user's limit, and users to read their own
        read: ({ req, doc }) => {
          if (isSuperAdmin(req.user)) return true
          // Allow users to read their own guestWriterPostLimit
          return req.user?.id === doc?.id
        },
      },
      admin: {
        position: 'sidebar',
        condition: showGuestWriterPostLimit,
        description: 'Maximum number of posts a guest-writer can create.',
      },
      defaultValue: 1,
    },
    {
      ...tenantsField,
      access: {
        update: isSuperAdminOrEditorFieldAccess,
        create: isSuperAdminOrEditorFieldAccess,
      },
      hooks: {
        beforeChange: [assignUsersToOneTenant],
      },
      maxRows: 1, // Ensure only one tenant assignment per user
      validate: validateTenantsField,
      admin: {
        position: 'sidebar',
        // Hidden - managed by UserRoleField which syncs from plugin's tenant field
        hidden: true,
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [ensureFirstUserSuperAdmin],
    afterChange: [verifyOnlySuperAdmin],
    beforeDelete: [preventLastSuperAdminDelete],
    afterLogin: [setCookieBasedOnDomain],
    afterRead: [populateTenantAllowedCollections],
  },
}
