import type { CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
  OrderedListFeature,
  UnorderedListFeature,
  UploadFeature,
} from '@payloadcms/richtext-lexical'

import {
  tenantCollectionAdminAccess,
  postsCreateAccess,
  postsUpdateAccess,
  postsDeleteAccess,
  postsReadAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
  topLevelUserFieldAccess,
  isTopLevelUser,
} from '@/access'
import { Collections } from '@/config'
import { hasGuestWriterRole } from '@/access/helpers'
import { parseSlug } from '@/utilities/parse-slug'
import { Banner } from '@/blocks/Banner/config'
import { CallToAction } from '@/blocks/CallToAction/config'
import { Code } from '@/blocks/Code/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { generatePreviewPath } from '@/utilities/generate-preview-path'
import { populateAuthors } from './hooks/populate-authors'
import { revalidateDelete, revalidatePost } from './hooks/revalidate-post'
import { assignGuestWriterAuthor, preventGuestWriterPublish } from './hooks/guest-writer'
import { autoPublishDate } from './hooks/auto-publish-date'
import { calculateReadingTimeHook } from './hooks/calculate-reading-time'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '@/fields/slug'
import { populateTenantDomain } from '@/payload-hooks/populate-tenant-domain'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  trash: true,
  lockDocuments: false,
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
    category: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    group: 'Site Content',
    hidden: shouldHideCollection('posts'),
    components: {
      Description: '@/components/guest-writer-limit-description#GuestWriterLimitDescription',
    },
    defaultColumns: ['title', 'slug', '_status', 'publishedAt'],
    livePreview: {
      url: async ({ data, req }) => {
        return generatePreviewPath({
          slug: parseSlug(data),
          collection: Collections.POSTS,
          data,
          req,
        })
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: parseSlug(data),
        collection: Collections.POSTS,
        data,
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
                    BlocksFeature({ blocks: [Banner, CallToAction, Code, MediaBlock] }),
                    UploadFeature({
                      collections: {
                        [Collections.MEDIA]: {
                          fields: [],
                        },
                      },
                    }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                    UnorderedListFeature(),
                    OrderedListFeature(),
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
                allowCreate: false,
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
              name: 'category',
              type: 'relationship',
              admin: {
                position: 'sidebar',
                allowCreate: false,
              },
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
                description:
                  'Override the default URL if this content exists elsewhere (leave empty to use default)',
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
        allowCreate: false,
      },
      access: {
        update: topLevelUserFieldAccess,
      },
      defaultValue: ({ req }) => {
        // Auto-assign current user for tenant-level users (tenant-admin, guest-writer)
        if (!isTopLevelUser(req.user)) return [req.user?.id].filter(Boolean)
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
          type: 'text',
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
    beforeChange: [
      assignGuestWriterAuthor,
      preventGuestWriterPublish,
      populateTenantDomain,
      calculateReadingTimeHook,
    ],
    afterChange: [revalidatePost],
    afterRead: [populateAuthors],
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
