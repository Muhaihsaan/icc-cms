import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
} from '@/access/accessPermission'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess('categories'),
    create: withTenantCollectionAccess('categories', tenantAdminUpdateAccess),
    delete: tenantAdminUpdateAccess, // Both admins can soft-delete (Trash tab hidden for tenant-admin)
    read: withTenantCollectionAccess('categories', tenantPublicReadAccess('categories')),
    update: withTenantCollectionAccess('categories', tenantAdminUpdateAccess),
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
    ...slugField(),
  ],
}
