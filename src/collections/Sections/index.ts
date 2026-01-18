import type { CollectionConfig } from 'payload'
import { slugField } from '@/fields/slug'
import {
  tenantCollectionAdminAccess,
  tenantAdminUpdateAccess,
  tenantPublicReadAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'

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
    afterRead: [
      ({ doc }) => {
        // Compute flattened data object from fields for easier frontend access
        if (doc.fields && Array.isArray(doc.fields)) {
          const data: Record<string, unknown> = {}
          for (const field of doc.fields) {
            if (field.key) {
              switch (field.type) {
                case 'text':
                  data[field.key] = field.textValue ?? null
                  break
                case 'textarea':
                  data[field.key] = field.textareaValue ?? null
                  break
                case 'richText':
                  data[field.key] = field.richTextValue ?? null
                  break
                case 'number':
                  data[field.key] = field.numberValue ?? null
                  break
                case 'date':
                  data[field.key] = field.dateValue ?? null
                  break
                case 'select':
                  data[field.key] = field.selectOptions?.map((opt: { value: string }) => opt.value) ?? []
                  break
                case 'media':
                  data[field.key] = field.mediaValue ?? null
                  break
                case 'link':
                  data[field.key] = field.linkValue ?? null
                  break
                case 'array':
                  // Convert array items - return text or media based on type
                  const items = field.arrayValue ?? []
                  data[field.key] = items.map((item: { type: string; value?: string; media?: unknown }) =>
                    item.type === 'media' ? item.media : item.value
                  )
                  break
              }
            }
          }
          doc.data = data
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    ...slugField('name'),
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
          defaultValue: 'text',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Textarea', value: 'textarea' },
            { label: 'Rich Text', value: 'richText' },
            { label: 'Number', value: 'number' },
            { label: 'Date', value: 'date' },
            { label: 'Select', value: 'select' },
            { label: 'Media', value: 'media' },
            { label: 'Internal Link', value: 'link' },
            { label: 'Array', value: 'array' },
          ],
        },
        {
          name: 'key',
          type: 'text',
          required: true,
          admin: { description: 'Field key (e.g., "title", "description")' },
        },
        // Text value (single line)
        {
          name: 'textValue',
          label: 'Value',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'text',
          },
        },
        // Textarea value (multi-line)
        {
          name: 'textareaValue',
          label: 'Value',
          type: 'textarea',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'textarea',
            rows: 6,
          },
        },
        // Rich text value
        {
          name: 'richTextValue',
          label: 'Value',
          type: 'richText',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'richText',
          },
        },
        // Number value
        {
          name: 'numberValue',
          label: 'Value',
          type: 'number',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'number',
          },
        },
        // Date value
        {
          name: 'dateValue',
          label: 'Value',
          type: 'date',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'date',
            date: {
              pickerAppearance: 'dayAndTime',
            },
          },
        },
        // Select options - text only
        {
          name: 'selectOptions',
          label: 'Options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'select',
            description: 'Define options for the select field',
          },
          fields: [
            { name: 'value', type: 'text', required: true },
          ],
        },
        // Media value
        {
          name: 'mediaValue',
          label: 'Value',
          type: 'upload',
          relationTo: 'media',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'media',
          },
        },
        // Link value (relationship to pages/posts)
        {
          name: 'linkValue',
          label: 'Value',
          type: 'relationship',
          relationTo: ['pages', 'posts'],
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'link',
            description: 'Link to an internal Page or Post. For external URLs, use Text type.',
          },
        },
        // Array items - text or media
        {
          name: 'arrayValue',
          label: 'Items',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.type === 'array',
          },
          fields: [
            {
              name: 'type',
              type: 'select',
              required: true,
              defaultValue: 'text',
              options: [
                { label: 'Text', value: 'text' },
                { label: 'Media', value: 'media' },
              ],
            },
            {
              name: 'value',
              type: 'text',
              admin: { condition: (_, siblingData) => siblingData?.type === 'text' },
            },
            {
              name: 'media',
              type: 'upload',
              relationTo: 'media',
              admin: { condition: (_, siblingData) => siblingData?.type === 'media' },
            },
          ],
        },
      ],
    },
  ],
}
