import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { createTenantRequestByDomain } from '@/utilities/createTenantRequest'

export async function getRedirects(tenantDomain: string, depth = 1) {
  const payload = await getPayload({ config: configPromise })
  const payloadReq = await createTenantRequestByDomain(payload, tenantDomain)
  if (!payloadReq) return []

  const { docs: redirects } = await payload.find({
    collection: 'redirects',
    req: payloadReq,
    depth,
    limit: 0,
    pagination: false,
  })

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
