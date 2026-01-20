import type { CollectionConfig } from 'payload'

import {
  tenantAdminUpdateAccess,
  tenantAdminCreateAccess,
  tenantPublicReadAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections, SectionFieldTypes } from '@/config'
import { slugField } from '@/fields/slug'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { parseSlug } from '@/utilities/parseSlug'
import { revalidateDelete, revalidatePage } from './hooks/revalidatePage'
import { computeSectionsDataHook } from './hooks/compute-sections-data'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { populateTenantDomain } from '@/payload-hooks/populate-tenant-domain'

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess(Collections.PAGES),
    create: withTenantCollectionAccess(Collections.PAGES, tenantAdminCreateAccess),
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
    group: 'Site Content',
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
      type: 'tabs',
      tabs: [
        {
          label: 'Sections',
          fields: [
            {
              name: 'sections',
              type: 'array',
              label: false,
              admin: {
                initCollapsed: true,
                description: 'Add content sections to this page',
              },
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  admin: { description: 'Section name (e.g., "Hero", "Features")' },
                },
                {
                  name: 'slug',
                  type: 'text',
                  admin: { description: 'Optional slug for anchor links (e.g., "hero" for #hero)' },
                },
                {
                  name: 'fields',
                  type: 'array',
                  admin: {
                    initCollapsed: false,
                    description: 'Define the fields for this section',
                  },
                  fields: [
                    {
                      name: 'type',
                      type: 'select',
                      required: true,
                      defaultValue: SectionFieldTypes.TEXT,
                      options: [
                        { label: 'Text', value: SectionFieldTypes.TEXT },
                        { label: 'Textarea', value: SectionFieldTypes.TEXTAREA },
                        { label: 'Rich Text', value: SectionFieldTypes.RICH_TEXT },
                        { label: 'Number', value: SectionFieldTypes.NUMBER },
                        { label: 'Date', value: SectionFieldTypes.DATE },
                        { label: 'Select', value: SectionFieldTypes.SELECT },
                        { label: 'Media', value: SectionFieldTypes.MEDIA },
                        { label: 'Internal Link', value: SectionFieldTypes.LINK },
                        { label: 'Array', value: SectionFieldTypes.ARRAY },
                      ],
                    },
                    {
                      name: 'key',
                      type: 'text',
                      required: true,
                      admin: { description: 'Field key (e.g., "title", "description")' },
                    },
                    {
                      name: 'textValue',
                      label: 'Value',
                      type: 'text',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.TEXT,
                      },
                    },
                    {
                      name: 'textareaValue',
                      label: 'Value',
                      type: 'textarea',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.TEXTAREA,
                        rows: 6,
                      },
                    },
                    {
                      name: 'richTextValue',
                      label: 'Value',
                      type: 'richText',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.RICH_TEXT,
                      },
                    },
                    {
                      name: 'numberValue',
                      label: 'Value',
                      type: 'number',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.NUMBER,
                      },
                    },
                    {
                      name: 'dateValue',
                      label: 'Value',
                      type: 'date',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.DATE,
                        date: {
                          pickerAppearance: 'dayAndTime',
                        },
                      },
                    },
                    {
                      name: 'selectOptions',
                      label: 'Options',
                      type: 'array',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.SELECT,
                        description: 'Define options for the select field',
                      },
                      fields: [
                        { name: 'value', type: 'text', required: true },
                      ],
                    },
                    {
                      name: 'mediaValue',
                      label: 'Value',
                      type: 'upload',
                      relationTo: 'media',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.MEDIA,
                      },
                    },
                    {
                      name: 'linkValue',
                      label: 'Value',
                      type: 'relationship',
                      relationTo: ['pages', 'posts'],
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.LINK,
                        description: 'Link to an internal Page or Post. For external URLs, use Text type.',
                      },
                    },
                    {
                      name: 'arrayValue',
                      label: 'Items',
                      type: 'array',
                      admin: {
                        condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.ARRAY,
                      },
                      fields: [
                        {
                          name: 'type',
                          type: 'select',
                          required: true,
                          defaultValue: SectionFieldTypes.TEXT,
                          options: [
                            { label: 'Text', value: SectionFieldTypes.TEXT },
                            { label: 'Media', value: SectionFieldTypes.MEDIA },
                          ],
                        },
                        {
                          name: 'value',
                          type: 'text',
                          admin: { condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.TEXT },
                        },
                        {
                          name: 'media',
                          type: 'upload',
                          relationTo: 'media',
                          admin: { condition: (_, siblingData) => siblingData?.type === SectionFieldTypes.MEDIA },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
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
    afterRead: [computeSectionsDataHook],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 3000,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
