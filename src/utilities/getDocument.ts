import type { Config } from 'src/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { createTenantRequestByDomain } from '@/utilities/createTenantRequest'

type Collection = keyof Config['collections']

async function getDocument(collection: Collection, slug: string, depth = 0, tenantDomain?: string) {
  const payload = await getPayload({ config: configPromise })
  const payloadReq = tenantDomain ? await createTenantRequestByDomain(payload, tenantDomain) : null

  if (tenantDomain && !payloadReq) return null

  const page = await payload.find({
    collection,
    depth,
    ...(payloadReq ? { req: payloadReq } : {}),
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return page.docs[0] ?? null
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedDocument = (collection: Collection, slug: string, tenantDomain?: string) =>
  unstable_cache(
    async () => getDocument(collection, slug, 0, tenantDomain),
    [collection, slug, tenantDomain ? `tenant:${tenantDomain}` : 'tenant:none'],
    {
      tags: [`${collection}_${slug}`],
    },
  )
