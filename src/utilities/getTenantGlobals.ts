import type { Config, Tenant } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { createTenantRequest } from '@/utilities/createTenantRequest'

type Global = keyof Config['collections']

async function getGlobal(collection: Global, depth = 0, tenant: Tenant | null) {
  const payload = await getPayload({ config: configPromise })

  if (!tenant) return null
  const payloadReq = await createTenantRequest(payload, tenant)

  const { docs } = await payload.find({
    collection,
    req: payloadReq,
    where: { 'tenant.id': { equals: tenant.id } },
    depth,
    limit: 1,
  })

  return docs[0] || null
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getTenantCachedGlobal = (collection: Global, depth = 0, tenant: Tenant | null) =>
  unstable_cache(
    async () => getGlobal(collection, depth, tenant),
    [collection, `${tenant?.id ?? ''}`],
    {
      tags: [`global_${collection}`],
    },
  )
