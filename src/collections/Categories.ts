import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideForTopLevelMode,
} from '@/access'
import { Collections } from '@/config/collections'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess(Collections.CATEGORIES),
    create: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
    delete: tenantAdminUpdateAccess, // Both admins can soft-delete (Trash tab hidden for tenant-admin)
    read: withTenantCollectionAccess(Collections.CATEGORIES, tenantPublicReadAccess(Collections.CATEGORIES)),
    update: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
  },
  admin: {
    hidden: ({ user }) => shouldHideForTopLevelMode(user),
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
