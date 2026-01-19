import { z } from 'zod'
import { Roles } from './roles'

// Basic ID Schemas

/** Schema for tenant ID - can be string or number */
export const tenantIdSchema = z.union([z.string(), z.number()])

/** Schema for tenant ID as object with id field */
export const tenantIdObjectSchema = z.object({ id: tenantIdSchema })

/** Schema that converts numeric strings to numbers */
export const numericStringSchema = z.string().transform((val) => {
  const num = Number(val)
  if (Number.isNaN(num) || !Number.isFinite(num)) return val
  return num
})

// User Role Schemas

/** Schema for validating user roles field */
export const userRolesSchema = z.object({
  roles: z.string().nullable().optional(),
})

/** Schema to check if user is top-level (super-admin or super-editor) */
export const topLevelUserSchema = z.object({
  roles: z.enum([Roles.superAdmin, Roles.superEditor]),
})

// Tenant Entry Schemas

/** Schema for a tenant entry with roles */
export const tenantEntrySchema = z.object({
  tenant: z.union([z.string(), z.number(), tenantIdObjectSchema]),
  roles: z.array(z.string()).nullable().optional(),
})

/** Schema for a tenant entry with roles and allowedCollections */
export const tenantEntryWithAllowedSchema = z.object({
  tenant: z.union([z.string(), z.number(), tenantIdObjectSchema]),
  roles: z.array(z.string()).nullable().optional(),
  allowedCollections: z.array(z.string()).nullable().optional(),
})

// User With Tenants Schemas

/** Schema for user with tenants array */
export const userTenantsSchema = z.object({
  tenants: z.array(tenantEntrySchema).nullable().optional(),
})

/** Schema for user with tenants containing roles (nullable entries) */
export const userWithTenantRolesSchema = z.object({
  tenants: z
    .array(
      z
        .object({
          tenant: z.unknown(),
          roles: z.array(z.string()).nullable().optional(),
        })
        .nullable(),
    )
    .nullable()
    .optional(),
})

/** Schema for user with tenants (tenant field only, nullable entries) */
export const userWithTenantsSchema = z.object({
  tenants: z
    .array(
      z
        .object({
          tenant: z.unknown(),
        })
        .nullable(),
    )
    .nullable()
    .optional(),
})

/** Schema for data with tenants array containing roles (for guest writer check) */
export const tenantsWithRolesSchema = z.object({
  tenants: z
    .array(
      z
        .object({
          roles: z.array(z.string()).nullable().optional(),
        })
        .nullable(),
    )
    .nullable()
    .optional(),
})

/** Schema for user with allowedCollections in tenant entries */
export const userWithAllowedCollectionsSchema = z.object({
  tenants: z.array(tenantEntryWithAllowedSchema).nullable().optional(),
})

// Admin Args Schemas

/** Schema for the args object passed to admin.hidden: { user: User } */
export const hiddenArgsSchema = z.object({
  user: userWithAllowedCollectionsSchema.nullable(),
})

/** Schema for request with tenant field */
export const reqWithTenantSchema = z.object({ tenant: z.unknown() })

// Utility Functions

/**
 * Normalize tenant value to number ID (or string if non-numeric).
 * Handles: number, numeric string, object with id field.
 */
export const normalizeTenantId = (value: unknown): string | number | undefined => {
  if (value === null || value === undefined) return undefined

  // Direct number
  if (typeof value === 'number') return value

  // String - try to convert to number
  if (typeof value === 'string') {
    const num = Number(value)
    if (!Number.isNaN(num) && Number.isFinite(num)) return num
    return value
  }

  // Object with id field
  if (typeof value === 'object' && 'id' in value) {
    return normalizeTenantId((value as { id: unknown }).id)
  }

  return undefined
}

/**
 * Check if user is a top-level user (super-admin or super-editor).
 * Uses Zod validation for unknown input (client-side safe).
 */
export const isTopLevelUserSchema = (user: unknown): boolean => {
  return topLevelUserSchema.safeParse(user).success
}

/** Check if user has super-admin role using Zod validation. */
export const isSuperAdminSchema = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superAdmin
}

/** Check if user has super-editor role using Zod validation. */
export const isSuperEditorSchema = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superEditor
}

// Access Control Helpers

/**
 * Check if a collection is allowed based on allowedCollections config.
 * Handles: undefined (not found), null (not configured), array (configured).
 */
export const isCollectionAllowed = (
  allowedCollections: string[] | null | undefined,
  collection: string,
): boolean => {
  // undefined = tenant not found, deny
  if (allowedCollections === undefined) return false
  // null = not configured, allow all (fail open)
  if (allowedCollections === null) return true
  // empty array = explicitly none, deny all
  if (allowedCollections.length === 0) return false
  return allowedCollections.includes(collection)
}
