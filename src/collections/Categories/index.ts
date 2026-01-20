import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantAdminCreateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'
import { slugField } from '@/fields/slug'

export const Categories: CollectionConfig = {
  slug: 'categories',
  trash: true,
  defaultPopulate: {
    title: true,
    slug: true,
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.CATEGORIES),
    create: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminCreateAccess),
    delete: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
    read: withTenantCollectionAccess(Collections.CATEGORIES, tenantPublicReadAccess(Collections.CATEGORIES)),
    update: withTenantCollectionAccess(Collections.CATEGORIES, tenantAdminUpdateAccess),
  },
  admin: {
    group: 'Site Content',
    hidden: shouldHideCollection('categories'),
    useAsTitle: 'title',
    description: 'Organize your posts by topic. Assign categories to posts in the Post editor under the Meta tab.',
    defaultColumns: ['title', 'slug'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
    {
      name: 'fullUrl',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Full URL path (auto-generated)',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data) return data
        if (data.slug) {
          data.fullUrl = `/${data.slug}`
        }
        return data
      },
    ],
  },
}
