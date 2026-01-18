import type { CollectionConfig } from 'payload'
import { z } from 'zod'

import {
  isSuperAdminAccess,
  isSuperAdminFieldAccess,
  Roles,
  tenantManagedCollections,
  tenantsReadAccess,
  tenantsUpdateAccess,
} from '@/access'
import { Collections } from '@/config/collections'
import { cleanAllowPublicRead } from './hooks/cleanAllowPublicRead'
import { validateAllowPublicRead, validateAllowedCollections } from './hooks/validators'

const userRolesSchema = z.object({ roles: z.string().nullable() }).nullable()

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  trash: true,
  access: {
    create: isSuperAdminAccess,
    delete: isSuperAdminAccess,
    read: tenantsReadAccess,
    update: tenantsUpdateAccess,
  },
  admin: {
    useAsTitle: 'name',
    hidden: ({ user }) => {
      const parsed = userRolesSchema.safeParse(user)
      if (!parsed.success) return true
      if (!parsed.data) return true
      const roles = parsed.data.roles
      return roles !== Roles.superAdmin && roles !== Roles.superEditor
    },
    components: {
      beforeList: ['@/components/TenantsListRedirect#TenantsListRedirect'],
    },
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
      index: true,
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
      relationTo: Collections.MEDIA,
    },
    {
      name: 'allowPublicRead',
      type: 'select',
      hasMany: true,
      admin: {
        description: 'First select allowedCollections, then choose which are publicly readable.',
        position: 'sidebar',
        // Only show when allowedCollections has selections
        condition: (data) => Array.isArray(data?.allowedCollections) && data.allowedCollections.length > 0,
        components: {
          Field: '@/components/AllowPublicReadField#AllowPublicReadField',
        },
      },
      defaultValue: [],
      options: tenantManagedCollections.map((collection) => ({
        label: collection,
        value: collection,
      })),
      validate: validateAllowPublicRead,
    },
    {
      name: 'allowedCollections',
      type: 'select',
      required: true,
      access: {
        create: isSuperAdminFieldAccess,
        update: isSuperAdminFieldAccess,
        read: isSuperAdminFieldAccess,
      },
      admin: {
        description: 'Select which collections this tenant can access.',
        position: 'sidebar',
      },
      hasMany: true,
      options: tenantManagedCollections.map((collection) => ({
        label: collection,
        value: collection,
      })),
      validate: validateAllowedCollections,
    },
  ],
  hooks: {
    beforeChange: [cleanAllowPublicRead],
  },
}
