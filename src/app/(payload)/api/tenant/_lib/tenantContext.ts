import configPromise from '@payload-config'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'
import type { Tenant } from '@/payload-types'

export type TenantRequest = PayloadRequest & { tenant?: Tenant | null }

export async function getTenantContext(slug: string): Promise<{
  payload: Awaited<ReturnType<typeof getPayload>>
  tenant: Tenant | null
  req: TenantRequest | null
}> {
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })

  const tenant = docs[0] ?? null
  if (!tenant) return { payload, tenant: null, req: null }

  const req: TenantRequest = await createLocalReq({ user: undefined }, payload)
  req.tenant = tenant

  return { payload, tenant, req }
}
