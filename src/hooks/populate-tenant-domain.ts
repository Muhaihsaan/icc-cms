import type { CollectionBeforeChangeHook } from 'payload'
import { z } from 'zod'

const tenantSchema = z.object({
  domain: z.string(),
})

const reqWithTenantSchema = z.object({
  tenant: tenantSchema,
})

export const populateTenantDomain: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data) return data

  const result = reqWithTenantSchema.safeParse(req)
  if (!result.success) return data

  return {
    ...data,
    tenantDomain: result.data.tenant.domain,
  }
}
