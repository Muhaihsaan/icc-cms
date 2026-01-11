import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

export const getTenantFromReq = (req: AccessArgs['req']): unknown =>
  (req as { tenant?: unknown }).tenant

// Normalize tenant value to string or Id.
// In admin UI, req.tenant is usually populated (object). In API calls, it might be just an ID (string/number).
export const normalizeTenantId = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = value.id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

export const getTenantIds = (user: User | null): Array<string | number> => {
  return (user?.tenants || []).reduce<Array<string | number>>((acc, tenantEntry) => {
    const value = normalizeTenantId(tenantEntry.tenant)
    if (value !== undefined) acc.push(value)
    return acc
  }, [])
}

export const getTenantAdminIds = (user: User | null): Array<string | number> => {
  return (user?.tenants || []).reduce<Array<string | number>>((acc, tenantEntry) => {
    if (tenantEntry.roles?.includes('tenant-admin')) {
      const value = normalizeTenantId(tenantEntry.tenant)
      if (value !== undefined) acc.push(value)
    }
    return acc
  }, [])
}
