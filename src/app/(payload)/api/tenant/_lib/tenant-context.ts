import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Tenant } from '@/payload-types'
import {
  createTenantRequest,
  fetchTenantByField,
  type TenantRequest,
} from '@/utilities/tenant/create-tenant-request'

type PayloadInstance = Awaited<ReturnType<typeof getPayload>>

type TenantContextSuccess = {
  success: true
  payload: PayloadInstance
  tenant: Tenant
  req: TenantRequest
}

type TenantContextFailure = {
  success: false
  payload: PayloadInstance
  errorMessage: string
  errorCode: number
}

type TenantContextResult = TenantContextSuccess | TenantContextFailure

// In-memory cache for tenant lookups by slug
// TTL of 60 seconds - provides rate limiting for API routes
const TENANT_CACHE_TTL_MS = 60 * 1000
const MAX_CACHE_SIZE = 50
const tenantCache = new Map<string, { tenant: Tenant | null; timestamp: number }>()

function cleanupStaleEntries(): void {
  const now = Date.now()
  for (const [key, value] of tenantCache) {
    if (now - value.timestamp > TENANT_CACHE_TTL_MS) {
      tenantCache.delete(key)
    }
  }
}

function evictOldestEntries(): void {
  // Evict oldest entries when cache exceeds max size
  if (tenantCache.size <= MAX_CACHE_SIZE) return

  const entries = Array.from(tenantCache.entries()).sort(
    (a, b) => a[1].timestamp - b[1].timestamp,
  )

  // Remove oldest entries to get back under limit
  const toRemove = entries.slice(0, tenantCache.size - MAX_CACHE_SIZE)
  for (const [key] of toRemove) {
    tenantCache.delete(key)
  }
}

async function getCachedTenant(
  payload: PayloadInstance,
  slug: string,
): Promise<Tenant | null> {
  const now = Date.now()
  const cached = tenantCache.get(slug)

  // Return cached value if still valid
  if (cached && now - cached.timestamp < TENANT_CACHE_TTL_MS) {
    return cached.tenant
  }

  // Remove stale entry if expired
  if (cached) {
    tenantCache.delete(slug)
  }

  // Cleanup stale entries proactively on cache miss
  cleanupStaleEntries()

  // Fetch from database using shared utility
  const tenant = await fetchTenantByField(
    payload,
    { slug: { equals: slug } },
    { depth: 0, overrideAccess: true },
  )

  // Update cache
  tenantCache.set(slug, { tenant, timestamp: now })

  // Ensure cache doesn't exceed max size
  evictOldestEntries()

  return tenant
}

export async function getTenantContext(slug: string): Promise<TenantContextResult> {
  const payload = await getPayload({ config: configPromise })

  const tenant = await getCachedTenant(payload, slug)
  if (!tenant) {
    return { success: false, payload, errorMessage: 'Tenant not found', errorCode: 404 }
  }

  const req = await createTenantRequest(payload, tenant)

  return { success: true, payload, tenant, req }
}
