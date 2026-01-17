import type { AccessArgs, ArrayField, CollectionConfig, Where } from 'payload'
import { z } from 'zod'

import {
  getEffectiveTenant,
  isSuperAdmin,
  isSuperAdminFieldAccess,
  isSuperAdminOrBootstrapFieldAccess,
  isSuperAdminOrEditor,
  isSuperAdminOrEditorFieldAccess,
  isTopLevelUser,
  Roles,
  usersBootstrapCreateAccess,
  usersDeleteAccess,
  usersReadAccess,
  usersUpdateAccess,
} from '@/access'
import { Collections } from '@/config/collections'
import { assignUsersToOneTenant } from './hooks/assignUsersToOneTenant'
import { setCookieBasedOnDomain } from './hooks/setCookieBasedOnDomain'
import { populateTenantAllowedCollections } from './hooks/populateTenantAllowedCollections'

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
      defaultValue: [Roles.tenantViewer],
      hasMany: true,
      required: false,
      options: [Roles.tenantAdmin, Roles.tenantViewer, Roles.guestWriter],
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
    admin: isSuperAdminOrEditor,
    create: usersBootstrapCreateAccess,
    delete: usersDeleteAccess,
    update: usersUpdateAccess,
    read: usersReadAccess,
  },
  admin: {
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
          Field: '@/components/UserRoleField',
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
      access: {
        create: isSuperAdminFieldAccess,
        update: isSuperAdminFieldAccess,
        read: isSuperAdminFieldAccess,
      },
      admin: {
        position: 'sidebar',
        hidden: true,
        description: 'Maximum number of published posts a guest-writer can create.',
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
      validate: async (value: unknown, { req, data }: { req: AccessArgs['req']; data: Partial<{ roles?: string | null }> }) => {
        // Bootstrap: no logged-in user means first user creation - will become super-admin
        if (!req.user) {
          const existingUsers = await req.payload.find({
            collection: Collections.USERS,
            depth: 0,
            limit: 1,
          })
          // First user will be super-admin, no tenant needed
          if (existingUsers.totalDocs === 0) return true
        }
        if (isSuperAdmin(req.user)) return true
        // Top-level users (super-admin/super-editor) don't need tenant
        if (data?.roles) return true
        const arraySchema = z.array(z.unknown())
        const parsed = arraySchema.safeParse(value)
        if (!parsed.success || parsed.data.length < 1) {
          return 'Tenant is required for non super-admin users.'
        }
        if (parsed.data.length > 1) return 'Only one tenant allowed'
        return true
      },
      admin: {
        position: 'sidebar',
        // Hidden - managed by UserRoleField which syncs from plugin's tenant field
        hidden: true,
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      // Ensure first user is always super-admin
      async ({ data, operation, req }) => {
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
      },
    ],
    beforeDelete: [
      // Ensure at least there is one super-admin account
      async ({ id, req }) => {
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
      },
    ],
    afterLogin: [setCookieBasedOnDomain],
    afterRead: [populateTenantAllowedCollections],
  },
}
