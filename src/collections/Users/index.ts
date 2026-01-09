import type { AccessArgs, CollectionConfig } from 'payload'

import { tenantsArrayField } from '@payloadcms/plugin-multi-tenant/fields'
import {
  isSuperAdmin,
  isSuperAdminAccess,
  isSuperAdminFieldAccess,
  isSuperAdminOrEditor,
  isSuperAdminOrEditorFieldAccess,
  Roles,
  usersBootstrapCreateAccess,
  usersCreateAccess,
  usersReadAccess,
} from '../../access/accessPermission'
import assignUsersToOneTenant from './hooks/assignUsersToOneTenant'
import { setCookieBasedOnDomain } from './hooks/setCookieBasedOnDomain'

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
      options: [Roles.tenantAdmin, Roles.tenantViewer],
      access: {
        update: isSuperAdminFieldAccess,
      },
    },
  ],
})

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: isSuperAdminOrEditor,
    create: usersBootstrapCreateAccess,
    delete: isSuperAdminAccess,
    update: usersReadAccess,
    read: usersReadAccess,
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      admin: {
        position: 'sidebar',
      },
      name: 'roles',
      type: 'select',
      options: [Roles.superAdmin],
      access: {
        create: isSuperAdminFieldAccess,
        update: isSuperAdminFieldAccess,
        read: isSuperAdminFieldAccess,
      },
    },
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (_data, _siblingData, { user }) => isSuperAdmin(user),
      },
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
      validate: (value: unknown, { req }: { req: AccessArgs['req'] }) => {
        if (!req.user) return true
        if (isSuperAdmin(req.user)) return true
        if (!Array.isArray(value) || value.length < 1) {
          return 'Tenant is required for non super-admin users.'
        }
        if (value.length > 1) return 'Only one tenant allowed'
        return true
      },
      admin: {
        ...(defaultTenantArrayField?.admin || {}),
        position: 'sidebar',
        // only super-admins can assign tenants manually
        condition: (_data, _siblingData, { user }) => isSuperAdmin(user),
      },
    },
  ],
  timestamps: true,
  hooks: {
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
