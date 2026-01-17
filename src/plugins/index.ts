import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { z } from 'zod'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import type { Config, Page, Post } from '@/payload-types'
import type { PayloadRequest } from 'payload'
import { isSuperAdmin, isSuperEditor } from '@/access'
import { Collections } from '@/config/collections'

import { getServerSideURL } from '@/utilities/getURL'

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
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          const result = namedFieldSchema.safeParse(field)
          if (result.success && result.data.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: [Collections.CATEGORIES],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      admin: {
        hidden: true,
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          const result = namedFieldSchema.safeParse(field)
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
          return field
        })
      },
    },
    formSubmissionOverrides: {
      admin: {
        hidden: true,
      },
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
      [Collections.PAGES]: {},
      [Collections.POSTS]: {},
      [Collections.HEADER]: {},
      [Collections.FOOTER]: {},
      [Collections.MEDIA]: {},
      [Collections.CATEGORIES]: {},
      [Collections.REDIRECTS]: {},
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
          validate: async (value: unknown, { req }: { req: PayloadRequest }): Promise<string | true> => {
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
