import { createLocalReq, getPayload, type Payload, type PayloadRequest, type Where } from 'payload'
import { unstable_cache } from 'next/cache'
import configPromise from '@payload-config'

import type { Tenant } from '@/payload-types'

/**
 * Base request that MAY have a tenant
 * (used in middleware, loaders, guards)
 */
export type TenantRequest = PayloadRequest & {
  tenant?: Tenant | null
}

/**
 * Request that DEFINITELY has a tenant
 * (used in hooks, CMS logic, rendering)
 */
export type TenantScopedRequest = PayloadRequest & {
  tenant: Tenant
}

/**
 * Strip port from domain string (e.g., "localhost:3000" -> "localhost")
 */
const cleanDomain = (domain: string): string => domain.split(':')[0]

/**
 * Internal helper to fetch tenant by any field
 */
const fetchTenantByField = async (
  payload: Payload,
  where: Where,
): Promise<Tenant | null> => {
  const { docs } = await payload.find({
    collection: 'tenants',
    where,
    depth: 1,
    limit: 1,
  })
  return docs[0] || null
}

/**
 * Internal uncached fetch for tenant by domain
 */
async function fetchTenantByDomainUncached(domain: string): Promise<Tenant | null> {
  const payload = await getPayload({ config: configPromise })
  const cleanedDomain = cleanDomain(domain)
  return fetchTenantByField(payload, { domain: { equals: cleanedDomain } })
}

/**
 * Fetch a tenant by domain (strips port if present)
 * Cached for performance - revalidates when tenant is updated
 */
export const fetchTenantByDomain = (domain: string): Promise<Tenant | null> => {
  const cleanedDomain = cleanDomain(domain)
  return unstable_cache(
    () => fetchTenantByDomainUncached(cleanedDomain),
    ['tenant', cleanedDomain],
    {
      tags: [`tenant:${cleanedDomain}`],
      revalidate: 3600, // Revalidate every hour as fallback
    },
  )()
}

/**
 * Create a PayloadRequest with tenant context
 */
export const createTenantRequest = async (
  payload: Payload,
  tenant: Tenant | null,
): Promise<TenantRequest> => {
  const payloadReq: TenantRequest = await createLocalReq({ user: undefined }, payload)
  payloadReq.tenant = tenant
  return payloadReq
}

/**
 * Fetch tenant by domain and create a TenantRequest in one call
 */
export const createTenantRequestByDomain = async (
  payload: Payload,
  domain: string,
): Promise<TenantRequest | null> => {
  const tenant = await fetchTenantByField(payload, { domain: { equals: cleanDomain(domain) } })
  if (!tenant) return null
  return createTenantRequest(payload, tenant)
}
