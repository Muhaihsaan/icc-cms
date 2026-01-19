import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'
import { slugField } from '@/fields/slug'
import { computeFullUrlHook, computeFullUrlAfterReadHook } from './hooks/compute-full-url'

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
    group: 'Site Content',
    hidden: shouldHideCollection('categories'),
    useAsTitle: 'title',
    description: 'Organize your posts by topic. Assign categories to posts in the Post editor under the Meta tab.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
    {
      name: 'parent',
      type: 'relationship',
      relationTo: Collections.CATEGORIES,
      admin: {
        position: 'sidebar',
        description: 'Optional parent category for nesting',
      },
      filterOptions: ({ id }) => {
        // Prevent selecting self as parent
        if (!id) return true
        return { id: { not_equals: id } }
      },
    },
    {
      name: 'fullUrl',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Full URL path (auto-generated)',
      },
    },
  ],
  hooks: {
    beforeChange: [computeFullUrlHook],
    afterRead: [computeFullUrlAfterReadHook],
  },
}
