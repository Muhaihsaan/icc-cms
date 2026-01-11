import type { CollectionConfig } from 'payload'

import {
  authenticated,
  isSuperAdmin,
  tenantPublicReadAccess,
  tenantReadAccess,
  tenantCollectionAdminAccess,
  usersCreateAccess,
  withTenantCollectionAccess,
} from '../access/accessPermission'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    admin: tenantCollectionAdminAccess('categories'),
    create: withTenantCollectionAccess('categories', usersCreateAccess),
    delete: withTenantCollectionAccess('categories', authenticated),
    read: withTenantCollectionAccess('categories', tenantPublicReadAccess()),
    update: withTenantCollectionAccess('categories', tenantReadAccess),
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
