import type { CollectionConfig } from 'payload'

import {
  authenticated,
  isSuperAdmin,
  tenantPublicReadAccess,
  tenantReadAccess,
  usersCreateAccess,
} from '../access/accessPermission'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    create: usersCreateAccess,
    delete: authenticated,
    read: tenantPublicReadAccess(),
    update: tenantReadAccess,
  },
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
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
    ...slugField(),
  ],
}
