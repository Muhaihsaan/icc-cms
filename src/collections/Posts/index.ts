import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { z } from 'zod'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import {
  tenantPublicReadAccess,
  tenantCollectionAdminAccess,
  postsCreateAccess,
  postsUpdateAccess,
  withTenantCollectionAccess,
} from '@/access'
import { Collections } from '@/config/collections'
import { hasGuestWriterRole } from '@/access/helpers'
import { Banner } from '@/blocks/Banner/config'
import { Code } from '@/blocks/Code/config'
import { MediaBlock } from '@/blocks/MediaBlock/config'
import { generatePreviewPath } from '@/utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'
import type { FieldAccess } from 'payload'
import type { Post } from '@/payload-types'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '@/fields/slug'
import { populateTenantDomain } from '@/hooks/populate-tenant-domain'
import { DocStatus } from '@/config/doc-status'

const slugSchema = z.object({ slug: z.string() })

const parseSlug = (data: unknown): string => {
  const parsed = slugSchema.safeParse(data)
  if (!parsed.success) return ''
  return parsed.data.slug
}

const assignGuestWriterAuthor: CollectionBeforeChangeHook<Post> = ({ req, data }) => {
  const user = req.user
  if (!user) return data
  if (!hasGuestWriterRole(user)) return data

  const nextData: Partial<Post> = data ?? {}

  return {
    ...nextData,
    authors: [user.id],
  }
}

const canUpdateAuthors: FieldAccess = ({ req }) => {
  const user = req.user
  if (!user) return false
  return !hasGuestWriterRole(user)
}

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess(Collections.POSTS),
    create: withTenantCollectionAccess(Collections.POSTS, postsCreateAccess),
    delete: postsUpdateAccess, // Both admins can soft-delete (Trash tab hidden for tenant-admin)
    read: tenantPublicReadAccess(Collections.POSTS, { publishedOnly: true }),
    update: postsUpdateAccess,
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
    components: {
      Description: '@/collections/Posts/GuestWriterLimitDescription#GuestWriterLimitDescription',
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
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
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
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === DocStatus.PUBLISHED && !value) {
              return new Date()
            }
            return value
          },
        ],
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
        update: canUpdateAuthors,
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
    beforeChange: [assignGuestWriterAuthor, populateTenantDomain],
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
