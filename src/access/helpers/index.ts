import type { AccessArgs } from 'payload'
import { z } from 'zod'

const TENANT_COOKIE_NAME = 'payload-tenant'

const tenantIdSchema = z.union([z.string(), z.number()])
const tenantIdObjectSchema = z.object({ id: tenantIdSchema })

// Schema that normalizes tenant value to just the ID using transform
export const tenantValueSchema = z.union([
  tenantIdSchema,
  tenantIdObjectSchema.transform((obj) => obj.id),
])

const reqWithTenantSchema = z.object({ tenant: z.unknown() })

export const getTenantFromReq = (req: AccessArgs['req']): unknown => {
  // First try to get from req.tenant (set by multi-tenant plugin)
  const result = reqWithTenantSchema.safeParse(req)
  if (result.success && result.data.tenant !== undefined && result.data.tenant !== null) {
    return result.data.tenant
  }

  // Fallback: read from cookie (for collections where plugin doesn't set req.tenant)
  try {
    const cookieHeader = req.headers?.get?.('cookie')
    if (!cookieHeader) return undefined

    const cookies = cookieHeader.split(';')
    for (const cookie of cookies) {
      const trimmed = cookie.trim()
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex === -1) continue
      const name = trimmed.substring(0, eqIndex)
      const value = trimmed.substring(eqIndex + 1)
      if (name === TENANT_COOKIE_NAME && value) {
        return decodeURIComponent(value)
      }
    }
  } catch {
    // Ignore cookie parsing errors
  }

  return undefined
}

// Schema that converts numeric strings to numbers
const numericStringSchema = z.string().transform((val) => {
  const num = Number(val)
  if (Number.isNaN(num) || !Number.isFinite(num)) return val
  return num
})

// Schema for normalizing tenant ID - converts numeric strings to numbers
const normalizedTenantIdSchema = z.union([
  z.number(),
  numericStringSchema,
  tenantIdObjectSchema.transform((obj) => {
    const id = obj.id
    const numParsed = z.number().safeParse(id)
    if (numParsed.success) return numParsed.data
    const strParsed = numericStringSchema.safeParse(id)
    if (strParsed.success) return strParsed.data
    return id
  }),
])

// Normalize tenant value to number ID (or string if non-numeric) using Zod schema validation
export const normalizeTenantId = (value: unknown): string | number | undefined => {
  const result = normalizedTenantIdSchema.safeParse(value)
  if (!result.success) return undefined
  return result.data
}
