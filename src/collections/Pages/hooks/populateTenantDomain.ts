import type { CollectionBeforeChangeHook } from 'payload'
import type { Tenant } from '@/payload-types'

export const populateTenantDomain: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data) return data

  const tenant = (req as { tenant?: Tenant | null }).tenant
  if (!tenant) return data

  return {
    ...data,
    tenantDomain: tenant.domain,
  }
}
