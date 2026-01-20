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
import { Collections } from '@/config'
import { cleanAllowPublicRead } from './hooks/clean-allow-public-read'
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
    group: 'Administrative',
    useAsTitle: 'name',
    hidden: ({ user }) => {
      const parsed = userRolesSchema.safeParse(user)
      if (!parsed.success) return true
      if (!parsed.data) return true
      const roles = parsed.data.roles
      return roles !== Roles.superAdmin && roles !== Roles.superEditor
    },
    components: {
      beforeList: ['@/components/TenantsListRedirect/tenants-list-redirect#TenantsListRedirect'],
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
      name: 'previewUrl',
      type: 'text',
      admin: {
        description: 'External frontend preview endpoint (e.g., https://my-frontend.com/api/preview)',
      },
    },
    {
      name: 'previewSecret',
      type: 'text',
      admin: {
        description: 'Secret token for validating preview requests',
      },
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
        components: {
          Label: '@/components/SelectAllLabel/select-all-label#AllowedCollectionsLabel',
        },
      },
      hasMany: true,
      options: tenantManagedCollections.map((collection) => ({
        label: collection,
        value: collection,
      })),
      validate: validateAllowedCollections,
    },
    {
      name: 'allowPublicRead',
      type: 'select',
      hasMany: true,
      admin: {
        description: 'Select which collections are publicly readable.',
        position: 'sidebar',
        condition: (data) =>
          Array.isArray(data?.allowedCollections) && data.allowedCollections.length > 0,
        components: {
          Label: '@/components/SelectAllLabel/select-all-label#AllowPublicReadLabel',
          Field: '@/components/AllowPublicReadField/allow-public-read-field#AllowPublicReadField',
        },
      },
      defaultValue: [],
      options: tenantManagedCollections.map((collection) => ({
        label: collection,
        value: collection,
      })),
      validate: validateAllowPublicRead,
    },
  ],
  hooks: {
    beforeChange: [cleanAllowPublicRead],
  },
}
