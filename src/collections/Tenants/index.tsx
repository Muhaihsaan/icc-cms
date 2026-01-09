import type { AccessArgs, CollectionConfig } from 'payload'

import { isSuperAdmin, normalizeTenantId, Roles } from '@/access/accessPermission'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: ({ req: { user } }: AccessArgs) => {
      return user?.roles?.includes('super-admin') || false
    },
    delete: ({ req: { user } }: AccessArgs) => {
      return user?.roles?.includes('super-admin') || false
    },
    read: ({ req: { user } }: AccessArgs) => {
      if (!user) return false
      if (isSuperAdmin(user)) return true
      if (!user.tenants) return false

      const tenantIds = user.tenants
        .filter((tenantEntry) => tenantEntry.roles?.includes(Roles.tenantAdmin))
        .map((tenantEntry) => normalizeTenantId(tenantEntry.tenant))
        .filter((value): value is string | number => value !== undefined)

      if (tenantIds.length === 0) return false

      return {
        id: { in: tenantIds },
      }
    },
    update: ({ req: { user } }: AccessArgs) => {
      if (!user) return false
      if (isSuperAdmin(user)) return true
      if (!user.tenants) return false

      const tenantIds = user.tenants
        .filter((tenantEntry) => tenantEntry.roles?.includes(Roles.tenantAdmin))
        .map((tenantEntry) => normalizeTenantId(tenantEntry.tenant))
        .filter((value): value is string | number => value !== undefined)

      if (tenantIds.length === 0) return false

      return {
        id: { in: tenantIds },
      }
    },
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
