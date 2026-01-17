import { z } from 'zod'

import { Roles } from '@/access/roles'

// Schema for validating user roles field
const userRolesSchema = z.object({
  roles: z.string().nullable().optional(),
})

// Schema for validating user tenants with roles
const tenantEntrySchema = z.object({
  tenant: z.union([z.string(), z.number(), z.object({ id: z.union([z.string(), z.number()]) })]),
  roles: z.array(z.string()).nullable().optional(),
})

const userTenantsSchema = z.object({
  tenants: z.array(tenantEntrySchema).nullable().optional(),
})

export const isSuperAdmin = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superAdmin
}

export const isSuperEditor = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superEditor
}

export const isTopLevelUser = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  const roles = parsed.data.roles
  if (!roles) return false
  return roles === Roles.superAdmin || roles === Roles.superEditor
}

export const getTenantAdminTenantId = (user: unknown): string | number | undefined => {
  const parsed = userTenantsSchema.safeParse(user)
  if (!parsed.success) return undefined

  const tenants = parsed.data.tenants
  if (!tenants || tenants.length !== 1) return undefined

  const entry = tenants[0]
  if (!entry) return undefined

  const roles = entry.roles
  if (!roles || !roles.includes(Roles.tenantAdmin)) return undefined

  const tenant = entry.tenant
  const tenantIdSchema = z.union([z.string(), z.number()])
  const directParsed = tenantIdSchema.safeParse(tenant)
  if (directParsed.success) return directParsed.data

  const objSchema = z.object({ id: tenantIdSchema })
  const objParsed = objSchema.safeParse(tenant)
  if (objParsed.success) return objParsed.data.id

  return undefined
}
