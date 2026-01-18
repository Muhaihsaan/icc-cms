import type React from 'react'
import type { Page, Post } from '@/payload-types'
import { z } from 'zod'

import { getCachedDocument } from '@/utilities/tenant/getDocument'
import { getCachedRedirects } from '@/utilities/tenant/getRedirects'
import { notFound, redirect } from 'next/navigation'
import { Collections } from '@/config'

const stringIdSchema = z.string()
const collectionSchema = z.enum([Collections.PAGES, Collections.POSTS])
const documentObjectSchema = z.object({
  slug: z.string().nullable().optional(),
})
const documentValidationSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string().nullable().optional(),
})
const documentSchema = z.custom<Page | Post>((val) => documentValidationSchema.safeParse(val).success)

interface Props {
  disableNotFound?: boolean
  tenantDomain: string
  url: string
}

/* This component helps us with SSR based dynamic redirects */
export const PayloadRedirects: React.FC<Props> = async ({ disableNotFound, tenantDomain, url }) => {
  const redirects = await getCachedRedirects(tenantDomain)()
  const withTenantPrefix = (path: string) =>
    path.startsWith('/') ? `/${tenantDomain}${path}` : path

  const redirectItem = redirects.find((r) => r.from === url)

  if (redirectItem) {
    if (redirectItem.to?.url) {
      redirect(withTenantPrefix(redirectItem.to.url))
    }

    let redirectUrl: string

    const referenceValue = redirectItem.to?.reference?.value
    const stringIdParsed = stringIdSchema.safeParse(referenceValue)

    if (stringIdParsed.success) {
      const collectionParsed = collectionSchema.safeParse(redirectItem.to?.reference?.relationTo)
      const id = stringIdParsed.data

      if (collectionParsed.success) {
        const docResult = await getCachedDocument(collectionParsed.data, id, tenantDomain)()
        const docParsed = documentSchema.safeParse(docResult)
        const slug = docParsed.success ? docParsed.data.slug : ''
        redirectUrl = `${collectionParsed.data !== Collections.PAGES ? `/${collectionParsed.data}` : ''}/${slug}`
      } else {
        redirectUrl = ''
      }
    } else {
      const objectParsed = documentObjectSchema.safeParse(referenceValue)
      const slug = objectParsed.success ? objectParsed.data.slug : ''
      const relationTo = redirectItem.to?.reference?.relationTo
      const collectionParsed = collectionSchema.safeParse(relationTo)
      const pathPrefix = collectionParsed.success && collectionParsed.data !== Collections.PAGES ? `/${collectionParsed.data}` : ''
      redirectUrl = `${pathPrefix}/${slug}`
    }

    if (redirectUrl) redirect(withTenantPrefix(redirectUrl))
  }

  if (disableNotFound) return null

  notFound()
}
