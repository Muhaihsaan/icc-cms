import type { CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import {
  tenantCollectionAdminAccess,
  postsCreateAccess,
  postsUpdateAccess,
  postsDeleteAccess,
  postsReadAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
  notGuestWriterFieldAccess,
} from '@/access'
import { Collections } from '@/config'
import { hasGuestWriterRole } from '@/access/helpers'
import { parseSlug } from '@/utilities/parseSlug'
import { Banner } from '@/blocks/Banner/config'
import { Code } from '@/blocks/Code/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import { assignGuestWriterAuthor, preventGuestWriterPublish } from './hooks/guestWriter'
import { autoPublishDate } from './hooks/autoPublishDate'
import { calculateReadingTimeHook } from './hooks/calculate-reading-time'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '@/fields/slug'
import { populateTenantDomain } from '@/hooks/populate-tenant-domain'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess(Collections.POSTS),
    create: withTenantCollectionAccess(Collections.POSTS, postsCreateAccess),
    delete: withTenantCollectionAccess(Collections.POSTS, postsDeleteAccess),
    read: postsReadAccess(Collections.POSTS, { publishedOnly: true }),
    update: withTenantCollectionAccess(Collections.POSTS, postsUpdateAccess),
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    hidden: shouldHideCollection('posts'),
    components: {
      Description: '@/components/GuestWriterLimitDescription#GuestWriterLimitDescription',
    },
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: parseSlug(data),
          collection: Collections.POSTS,
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: parseSlug(data),
        collection: Collections.POSTS,
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
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: Collections.MEDIA,
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'relatedPosts',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id }) => {
                return {
                  id: {
                    not_in: [id],
                  },
                }
              },
              hasMany: true,
              relationTo: Collections.POSTS,
            },
            {
              name: 'categories',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              relationTo: Collections.CATEGORIES,
            },
          ],
          label: 'Meta',
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
            {
              name: 'canonicalUrl',
              type: 'text',
              admin: {
                description: 'Override the default URL if this content exists elsewhere (leave empty to use default)',
              },
            },
            {
              name: 'noIndex',
              type: 'checkbox',
              defaultValue: false,
              admin: {
                description: 'Prevent search engines from indexing this post',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
        // Hidden for guest writers - preventGuestWriterPublish hook enforces draft status
        condition: (_data, _siblingData, { user }) => !hasGuestWriterRole(user),
      },
      hooks: {
        beforeChange: [autoPublishDate],
      },
    },
    {
      name: 'readingTime',
      type: 'number',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Estimated reading time in minutes (auto-calculated)',
      },
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
      name: 'authors',
      type: 'relationship',
      index: true,
      admin: {
        position: 'sidebar',
      },
      access: {
        update: notGuestWriterFieldAccess,
      },
      defaultValue: ({ req }) => {
        if (hasGuestWriterRole(req.user)) return [req.user?.id].filter(Boolean)
        return undefined
      },
      hasMany: true,
      relationTo: Collections.USERS,
      required: true,
      maxDepth: 0,
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'number',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    ...slugField(),
  ],
  hooks: {
    beforeChange: [assignGuestWriterAuthor, preventGuestWriterPublish, populateTenantDomain, calculateReadingTimeHook],
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
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
