import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { z } from 'zod'
import { revalidateRedirects } from '@/payload-hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/searchIndexFields'
import { beforeSyncWithSearch } from '@/search/searchDocumentTransformer'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import type { Config, Page, Post } from '@/payload-types'
import type { PayloadRequest } from 'payload'
import { isSuperAdmin, isSuperEditor } from '@/access'
import { hasGuestWriterRole } from '@/access/helpers'
import { Collections } from '@/config'

import { getServerSideURL } from '@/utilities/getURL'
import { formatSlugHook } from '@/fields/slug/formatSlug'

const namedFieldSchema = z.object({ name: z.string() })

const generateTitle: GenerateTitle<Post | Page> = async ({ doc, req }) => {
  const tenant = await req.payload.find({
    collection: Collections.TENANTS,
    where: { id: { equals: doc?.tenant } },
    limit: 1,
  })
  const tenantName = tenant?.docs?.[0]?.name || 'Payload'
  return doc?.title ? `${doc.title} | ${tenantName}` : tenantName
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: [Collections.PAGES, Collections.POSTS],
    overrides: {
      admin: {
        hidden: true,
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
      country: false,
      state: false,
    },
    formOverrides: {
      admin: {
        group: 'Forms',
        description: 'Create forms that can be embedded on external frontends',
        hidden: ({ user }) => hasGuestWriterRole(user),
        defaultColumns: ['title', 'fields', 'confirmationType'],
        useAsTitle: 'title',
      },
      access: {
        admin: ({ req }) => !hasGuestWriterRole(req.user),
        read: ({ req }) => !hasGuestWriterRole(req.user),
        create: ({ req }) => !hasGuestWriterRole(req.user),
        update: ({ req }) => !hasGuestWriterRole(req.user),
        delete: ({ req }) => !hasGuestWriterRole(req.user),
      },
      fields: ({ defaultFields }) => {
        const slugLockField = {
          name: 'slugLock',
          // 'as const' narrows type from string to literal 'checkbox' - required for Payload's Field union type
          type: 'checkbox' as const,
          defaultValue: true,
          admin: {
            hidden: true,
            // 'as const' narrows to literal 'sidebar' for Payload's position union type
            position: 'sidebar' as const,
          },
        }

        const slugField = {
          name: 'slug',
          // 'as const' - same reason: Payload needs literal type, not string
          type: 'text' as const,
          label: 'Slug',
          unique: true,
          index: true,
          hooks: {
            beforeValidate: [formatSlugHook('title')],
          },
          admin: {
            position: 'sidebar' as const, // literal type for Payload
            components: {
              Field: {
                path: '@/fields/slug/SlugComponent#SlugComponent',
                clientProps: {
                  fieldToUse: 'title',
                  checkboxFieldPath: 'slugLock',
                },
              },
            },
          },
        }

        const modifiedFields = defaultFields.map((field) => {
          const result = namedFieldSchema.safeParse(field)
          // Customize confirmationMessage editor
          if (result.success && result.data.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          // Replace redirect text field with flexible link (internal page or custom URL)
          if (result.success && result.data.name === 'redirect') {
            return {
              name: 'redirect',
              type: 'group' as const, // literal type for Payload

              label: 'Redirect',
              admin: {
                condition: (_: unknown, siblingData: Record<string, unknown>) =>
                  siblingData?.confirmationType === 'redirect',
              },
              fields: [
                {
                  name: 'type',
                  type: 'radio' as const, // literal type for Payload
                  defaultValue: 'page',
                  options: [
                    { label: 'Internal Page', value: 'page' },
                    { label: 'Custom URL', value: 'custom' },
                  ],
                },
                {
                  name: 'page',
                  type: 'relationship' as const, // literal type for Payload
                  relationTo: Collections.PAGES,
                  label: 'Select Page',
                  admin: {
                    allowCreate: false,
                    condition: (_: unknown, siblingData: Record<string, unknown>) =>
                      siblingData?.type === 'page',
                  },
                },
                {
                  name: 'url',
                  type: 'text' as const, // literal type for Payload
                  label: 'Custom URL',
                  admin: {
                    condition: (_: unknown, siblingData: Record<string, unknown>) =>
                      siblingData?.type === 'custom',
                  },
                },
              ],
            }
          }
          return field
        })

        return [slugField, slugLockField, ...modifiedFields]
      },
    },
    formSubmissionOverrides: {
      admin: {
        group: 'Forms',
        description: 'View submissions received from external frontends',
        hideAPIURL: true,
        useAsTitle: 'formTitle',
        defaultColumns: ['form', 'createdAt'],
        hidden: ({ user }) => hasGuestWriterRole(user),
      },
      access: {
        admin: ({ req }) => !hasGuestWriterRole(req.user),
        read: ({ req }) => !hasGuestWriterRole(req.user),
        create: () => false,
        update: () => false,
      },
      fields: ({ defaultFields }) => [
        ...defaultFields,
        {
          name: 'formTitle',
          type: 'text' as const, // literal type for Payload
          admin: { hidden: true },
          hooks: {
            afterRead: [
              async ({ data, req }) => {
                if (!data?.form) return null
                const formIdSchema = z.string()
                const formId = formIdSchema.safeParse(data.form)
                if (!formId.success) return null
                const form = await req.payload.findByID({
                  collection: 'forms',
                  id: formId.data,
                  depth: 0,
                })
                return form?.title ?? null
              },
            ],
          },
        },
      ],
    },
  }),
  searchPlugin({
    collections: [Collections.POSTS],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      admin: {
        hidden: true,
      },
      fields: ({ defaultFields }) => {
        // Add index to the default 'title' field for search performance
        const indexedDefaultFields = defaultFields.map((field) => {
          const parsed = namedFieldSchema.safeParse(field)
          if (parsed.success && parsed.data.name === 'title' && field.type === 'text') {
            return { ...field, index: true }
          }
          return field
        })
        return [...indexedDefaultFields, ...searchFields]
      },
    },
  }),
  payloadCloudPlugin(),

  multiTenantPlugin<Config>({
    collections: {
      [Collections.PAGES]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.POSTS]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.HEADER]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.FOOTER]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.MEDIA]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.CATEGORIES]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.REDIRECTS]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.FORMS]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.FORM_SUBMISSIONS]: {
        tenantFieldOverrides: { admin: { readOnly: true } },
      },
      [Collections.USERS]: {
        // We use custom baseListFilter in Users collection config
        useBaseListFilter: false,
        useTenantAccess: false,
        tenantFieldOverrides: {
          // Show the field in sidebar
          admin: {
            position: 'sidebar',
            // Don't hide - UserRoleField CSS will control visibility
          },
          // Allow empty tenant for bootstrap and top-level users
          validate: async (_value: unknown, { req }: { req: PayloadRequest }): Promise<string | true> => {
            // Bootstrap: no user = first user creation
            if (!req.user) {
              const existingUsers = await req.payload.find({
                collection: Collections.USERS,
                depth: 0,
                limit: 1,
              })
              if (existingUsers.totalDocs === 0) return true
            }
            // Top-level users don't need tenant
            if (isSuperAdmin(req.user)) return true
            if (isSuperEditor(req.user)) return true
            return true
          },
        },
      },
    },
    userHasAccessToAllTenants: (user) => isSuperAdmin(user) || isSuperEditor(user),
    tenantsArrayField: {
      includeDefaultField: false,
    },
  }),
]
