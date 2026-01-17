import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
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

const siblingDataSchema = z.object({
  allowedCollections: z.array(z.string()).optional(),
})

const userRolesSchema = z.object({ roles: z.string().nullable() }).nullable()

// Auto-clean allowPublicRead when allowedCollections changes
const cleanAllowPublicRead: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data
  const allowed = data.allowedCollections
  const publicRead = data.allowPublicRead
  // Filter allowPublicRead to only valid options from allowedCollections
  if (Array.isArray(publicRead) && Array.isArray(allowed)) {
    return { ...data, allowPublicRead: publicRead.filter((v) => allowed.includes(v)) }
  }
  return data
}

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
      // Validate: only allow values that are in allowedCollections
      validate: (value, { siblingData }) => {
        if (!Array.isArray(value) || value.length === 0) return true
        const parsed = siblingDataSchema.safeParse(siblingData)
        if (!parsed.success) return true
        const allowed = parsed.data.allowedCollections
        if (!allowed || allowed.length === 0) return true
        const invalid: string[] = []
        for (const v of value) {
          if (!allowed.includes(v)) invalid.push(v)
        }
        if (invalid.length > 0) {
          return `Remove: ${invalid.join(', ')} (not in allowedCollections)`
        }
        return true
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
      },
      hasMany: true,
      options: tenantManagedCollections.map((collection) => ({
        label: collection,
        value: collection,
      })),
      validate: (value) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one collection must be selected.'
        }
        return true
      },
    },
  ],
  hooks: {
    beforeChange: [cleanAllowPublicRead],
  },
}
