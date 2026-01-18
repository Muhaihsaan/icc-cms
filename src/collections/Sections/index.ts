import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import {
  tenantCollectionAdminAccess,
  tenantAdminUpdateAccess,
  tenantPublicReadAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections, SectionFieldTypes } from '@/config'
import { computeSectionDataHook } from './hooks/compute-section-data'

export const Sections: CollectionConfig = {
  slug: 'sections',
  admin: {
    useAsTitle: 'name',
    hidden: shouldHideCollection('sections'),
    group: 'Content',
    defaultColumns: ['name', 'slug', 'updatedAt'],
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.SECTIONS),
    create: withTenantCollectionAccess(Collections.SECTIONS, tenantAdminUpdateAccess),
    delete: withTenantCollectionAccess(Collections.SECTIONS, tenantAdminUpdateAccess),
    read: tenantPublicReadAccess(Collections.SECTIONS),
    update: withTenantCollectionAccess(Collections.SECTIONS, tenantAdminUpdateAccess),
  },
  hooks: {
    afterRead: [computeSectionDataHook],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    ...slugField('name'),
    {
      name: 'page',
      type: 'relationship',
      relationTo: 'pages',
      admin: {
        description: 'Link this section to a page (optional)',
        position: 'sidebar',
      },
    },
    {
      name: 'fields',
      type: 'array',
      required: true,
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
}
