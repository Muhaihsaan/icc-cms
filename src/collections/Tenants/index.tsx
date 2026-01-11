import type { CollectionConfig } from 'payload'

import {
  isSuperAdmin,
  isSuperAdminAccess,
  isSuperAdminFieldAccess,
  tenantManagedCollections,
  tenantsReadAccess,
  tenantsUpdateAccess,
} from '@/access/accessPermission'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: isSuperAdminAccess,
    delete: isSuperAdminAccess,
    read: tenantsReadAccess,
    update: tenantsUpdateAccess,
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'domain',
      type: 'text',
      admin: {
        description: 'Used for domain-based tenant handling',
      },
    },
    {
      name: 'slug',
      type: 'text',
      admin: {
        description: 'Used for url paths, example: /tenant-slug/page-slug',
      },
      index: true,
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'allowPublicRead',
      type: 'checkbox',
      admin: {
        description:
          'If checked, logging in is not required to read. Useful for building public pages.',
        position: 'sidebar',
      },
      defaultValue: true,
      index: true,
    },
    {
      name: 'allowedCollections',
      type: 'select',
      access: {
        create: isSuperAdminFieldAccess,
        update: isSuperAdminFieldAccess,
        read: isSuperAdminFieldAccess,
      },
      admin: {
        description: 'If empty, all collections are available to this tenant.',
        position: 'sidebar',
      },
      hasMany: true,
      options: tenantManagedCollections.map((collection) => ({
        label: collection,
        value: collection,
      })),
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
  ],
}
