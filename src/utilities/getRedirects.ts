import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { createTenantRequestByDomain } from '@/utilities/createTenantRequest'
import { Collections } from '@/config/collections'

import type { Redirect } from '@/payload-types'

type RedirectData = Pick<Redirect, 'id' | 'from' | 'to'>

const REDIRECTS_PAGE_SIZE = 100

export async function getRedirects(tenantDomain: string, depth = 1): Promise<RedirectData[]> {
  const payload = await getPayload({ config: configPromise })
  const payloadReq = await createTenantRequestByDomain(payload, tenantDomain)
  if (!payloadReq?.tenant) return []

  const redirects: RedirectData[] = []
  let page = 1
  let hasMore = true

  // Paginated fetching to handle any number of redirects
  while (hasMore) {
    const results = await payload.find({
      collection: Collections.REDIRECTS,
      req: payloadReq,
      depth,
      limit: REDIRECTS_PAGE_SIZE,
      page,
      select: {
        from: true,
        to: true,
      },
      where: {
        tenant: { equals: payloadReq.tenant.id },
      },
    })

    redirects.push(...results.docs)
    hasMore = results.hasNextPage
    page++
  }

  return redirects
}

/**
 * Returns a unstable_cache function mapped with the cache tag for 'redirects'.
 *
 * Cache all redirects together to avoid multiple fetches.
 */
export const getCachedRedirects = (tenantDomain: string) =>
  unstable_cache(async () => getRedirects(tenantDomain), ['redirects', tenantDomain], {
    tags: ['redirects'],
  })
