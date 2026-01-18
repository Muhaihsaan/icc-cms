import type { CollectionConfig } from 'payload'

import {
  tenantAdminUpdateAccess,
  tenantPublicReadAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'
import { slugField } from '@/fields/slug'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { parseSlug } from '@/utilities/parseSlug'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { populateTenantDomain } from '@/hooks/populate-tenant-domain'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess(Collections.PAGES),
    create: withTenantCollectionAccess(Collections.PAGES, tenantAdminUpdateAccess),
    delete: withTenantCollectionAccess(Collections.PAGES, tenantAdminUpdateAccess),
    read: tenantPublicReadAccess(Collections.PAGES, { publishedOnly: true }),
    update: withTenantCollectionAccess(Collections.PAGES, tenantAdminUpdateAccess),
  },
  // This config controls what's populated by default when a page is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'pages'>
  defaultPopulate: {
    title: true,
    slug: true,
  },
  admin: {
    hidden: shouldHideCollection('pages'),
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) =>
        generatePreviewPath({
          slug: parseSlug(data),
          collection: Collections.PAGES,
          req,
        }),
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: parseSlug(data),
        collection: Collections.PAGES,
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
    {
      name: 'meta',
      label: 'SEO',
      type: 'group',
      fields: [
        OverviewField({
          titlePath: 'meta.title',
          descriptionPath: 'meta.description',
          imagePath: 'meta.image',
        }),
        MetaTitleField({
          hasGenerateFn: true,
        }),
        MetaImageField({
          relationTo: Collections.MEDIA,
        }),
        MetaDescriptionField({}),
        PreviewField({
          hasGenerateFn: true,
          titlePath: 'meta.title',
          descriptionPath: 'meta.description',
        }),
      ],
    },
    {
      name: 'tenantDomain',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [populateTenantDomain],
    afterChange: [revalidatePage],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
