import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  trash: true,
  lockDocuments: false,
  admin: {
    group: 'Site Content',
    hidden: shouldHideCollection('media'),
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.MEDIA),
    create: withTenantCollectionAccess(Collections.MEDIA, tenantAdminUpdateAccess),
    delete: tenantAdminUpdateAccess, // Both admins can soft-delete (Trash tab hidden for tenant-admin)
    read: withTenantCollectionAccess(Collections.MEDIA, tenantPublicReadAccess(Collections.MEDIA)),
    update: withTenantCollectionAccess(Collections.MEDIA, tenantAdminUpdateAccess),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    {
      name: 'fileUrl',
      type: 'text',
      label: 'File URL',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            // Payload auto-generates 'url' for upload collections
            return siblingData?.url || undefined
          },
        ],
      },
    },
  ],
  upload: {
    // Upload to the public/media directory in Next.js making them publicly accessible even outside of Payload
    staticDir: path.resolve(dirname, '../../public/media'),
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
