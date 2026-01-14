import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'
import type { Page } from '@/payload-types'

const toTenantPath = (tenantDomain: string, slug?: string | null): string => {
  const cleanSlug = slug && slug !== 'home' ? slug : ''
  return `/${tenantDomain}/${cleanSlug}`.replace(/\/$/, '/')
}

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context?.disableRevalidate) return doc

  const tenantDomain = doc.tenantDomain
  if (!tenantDomain) return doc

  // Revalidate current page when published
  if (doc._status === 'published') {
    const path = toTenantPath(tenantDomain, doc.slug)
    payload.logger.info(`Revalidating page: ${path}`)

    revalidatePath(path)
    revalidateTag('pages-sitemap')
    revalidateTag(`page:${tenantDomain}:${doc.slug}`)
  }

  // Revalidate old page if it was previously published
  if (previousDoc?._status === 'published' && previousDoc.tenantDomain) {
    const oldPath = toTenantPath(previousDoc.tenantDomain, previousDoc.slug)
    payload.logger.info(`Revalidating old page: ${oldPath}`)

    revalidatePath(oldPath)
    revalidateTag('pages-sitemap')
    revalidateTag(`page:${previousDoc.tenantDomain}:${previousDoc.slug}`)
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (context?.disableRevalidate) return doc
  if (!doc?.tenantDomain) return doc

  const path = toTenantPath(doc.tenantDomain, doc.slug)

  revalidatePath(path)
  revalidateTag('pages-sitemap')
  revalidateTag(`page:${doc.tenantDomain}:${doc.slug}`)

  return doc
}
