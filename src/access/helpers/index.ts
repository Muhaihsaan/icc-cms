import type { AccessArgs } from 'payload'
import { z } from 'zod'

const tenantIdSchema = z.union([z.string(), z.number()])
const tenantIdObjectSchema = z.object({ id: tenantIdSchema })

// Schema that normalizes tenant value to just the ID using transform
export const tenantValueSchema = z.union([
  tenantIdSchema,
  tenantIdObjectSchema.transform((obj) => obj.id),
])

const reqWithTenantSchema = z.object({ tenant: z.unknown() })

export const getTenantFromReq = (req: AccessArgs['req']): unknown => {
  const result = reqWithTenantSchema.safeParse(req)
  if (!result.success) return undefined
  return result.data.tenant
}

// Normalize tenant value to string or number ID using Zod schema validation
export const normalizeTenantId = (value: unknown): string | number | undefined => {
  const result = tenantValueSchema.safeParse(value)
  if (!result.success) return undefined
  return result.data
}
