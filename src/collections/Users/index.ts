import type { AccessArgs, CollectionConfig } from 'payload'

import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import {
  isSuperAdmin,
  isSuperAdminFieldAccess,
  isSuperAdminOrBootstrapFieldAccess,
  isSuperAdminOrEditor,
  isSuperAdminOrEditorFieldAccess,
  Roles,
  usersBootstrapCreateAccess,
  usersDeleteAccess,
  usersReadAccess,
} from '../../access/accessPermission'
import { assignUsersToOneTenant } from './hooks/assignUsersToOneTenant'
import { setCookieBasedOnDomain } from './hooks/setCookieBasedOnDomain'

const isGuestWriterAssignment = (data?: {
  tenants?: { roles?: string[] | null }[] | null
}): boolean => {
  if (!data?.tenants) return false
  for (const tenantEntry of data.tenants) {
    if (!Array.isArray(tenantEntry?.roles)) continue
    if (tenantEntry.roles.includes(Roles.guestWriter)) return true
  }
  return false
}

const defaultTenantArrayField = tenantsArrayField({
  tenantsArrayFieldName: 'tenants',
  tenantsArrayTenantFieldName: 'tenant',
  tenantsCollectionSlug: 'tenants',
  arrayFieldAccess: {},
  tenantFieldAccess: {},
  rowFields: [
    {
      name: 'roles',
      type: 'select',
      defaultValue: [Roles.tenantViewer],
      hasMany: true,
      required: true,
      options: [Roles.tenantAdmin, Roles.tenantViewer, Roles.guestWriter],
      access: {
        update: isSuperAdminFieldAccess,
      },
    },
  ],
})

export const Users: CollectionConfig = {
  slug: 'users',
  trash: true,
  access: {
    admin: isSuperAdminOrEditor,
    create: usersBootstrapCreateAccess,
    delete: usersDeleteAccess,
    update: usersReadAccess,
    read: usersReadAccess,
  },
  admin: {
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'roleLevel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (_data, _siblingData, { user }) => isSuperAdmin(user),
        components: {
          Field: '@/components/RoleLevelSelector',
        },
      },
    },
    {
      admin: {
        position: 'sidebar',
        hidden: true, // Hidden because RoleLevelSelector handles the UI
      },
      name: 'roles',
      type: 'select',
      options: [Roles.superAdmin, Roles.superEditor],
      defaultValue: Roles.superAdmin, // First user becomes super-admin by default
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
        condition: (data, siblingData, { user }) =>
          isSuperAdmin(user) && (isGuestWriterAssignment(data) || isGuestWriterAssignment(siblingData)),
        description: 'Maximum number of published posts a guest-writer can create.',
      },
      defaultValue: 1,
    },
    {
      ...defaultTenantArrayField,
      access: {
        update: isSuperAdminOrEditorFieldAccess,
        create: isSuperAdminOrEditorFieldAccess,
      },
      hooks: {
        beforeChange: [assignUsersToOneTenant],
      },
      maxRows: 1, // Ensure only one tenant assignment per user
      validate: (value: unknown, { req, data }: { req: AccessArgs['req']; data: Partial<{ roles?: string | null }> }) => {
        if (!req.user) return true
        if (isSuperAdmin(req.user)) return true
        // Top-level users (super-admin/super-editor) don't need tenant
        if (data?.roles) return true
        if (!Array.isArray(value) || value.length < 1) {
          return 'Tenant is required for non super-admin users.'
        }
        if (value.length > 1) return 'Only one tenant allowed'
        return true
      },
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: 'sidebar',
        // Show tenants field when "Tenant Level" is selected (roles is empty)
        condition: (data, _siblingData, { user }) => {
          if (!isSuperAdmin(user)) return false
          // Show when roles is empty (tenant level)
          return !data?.roles
        },
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
          collection: 'users',
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
          collection: 'users',
          id,
          depth: 0,
        })

        if (!isSuperAdmin(userToDelete)) return

        const superAdmins = await req.payload.find({
          collection: 'users',
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
  },
}
