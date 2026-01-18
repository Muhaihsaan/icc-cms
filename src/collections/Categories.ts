import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config/collections'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess(Collections.CATEGORIES),
    create: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
    delete: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
    read: withTenantCollectionAccess(Collections.CATEGORIES, tenantPublicReadAccess(Collections.CATEGORIES)),
    update: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
  },
  admin: {
    hidden: shouldHideCollection('categories'),
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
