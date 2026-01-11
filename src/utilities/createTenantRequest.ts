import { createLocalReq, type Payload, type PayloadRequest } from 'payload'

import type { Tenant } from '@/payload-types'

export type TenantRequest = PayloadRequest & { tenant?: Tenant | null }

export const createTenantRequest = async (
  payload: Payload,
  tenant: Tenant | null,
): Promise<TenantRequest> => {
  const payloadReq: TenantRequest = await createLocalReq({ user: undefined }, payload)
  payloadReq.tenant = tenant
  return payloadReq
}

export const createTenantRequestByDomain = async (
  payload: Payload,
  domain: string,
): Promise<TenantRequest | null> => {
  const domainClean = domain.split(':')[0]
  const { docs } = await payload.find({
    collection: 'tenants',
    where: { domain: { equals: domainClean } },
    depth: 1,
    limit: 1,
  })

  const tenant = docs[0] || null
  if (!tenant) return null

  return createTenantRequest(payload, tenant)
}
