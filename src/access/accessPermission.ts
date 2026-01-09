import type { Access, FieldAccess, Where } from 'payload'
import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type isAuthenticated = (args: AccessArgs<User>) => boolean
type TenantRequest = AccessArgs['req'] & { tenant?: { id?: string } }

export const Roles = {
  superAdmin: 'super-admin',
  tenantAdmin: 'tenant-admin',
  tenantViewer: 'tenant-viewer',
} as const

// Allow access to any request.
export const anyone: Access = () => true

// Allow access only when a user is authenticated.
export const authenticated: isAuthenticated = ({ req: { user } }) => {
  return Boolean(user)
}

// Allow access for authenticated users or published content for public requests.
export const authenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}

// Allow collection access only for super-admin users.
export const isSuperAdminAccess: Access = ({ req }): boolean => {
  return isSuperAdmin(req.user)
}

// Allow field access only for super-admin users.
export const isSuperAdminFieldAccess: FieldAccess = ({ req }): boolean => {
  return isSuperAdmin(req.user)
}

// Check whether a user has the super-admin role.
export const isSuperAdmin = (user: User | null): boolean => {
  return Boolean(user?.roles?.includes(Roles.superAdmin))
}

type TenantRole = typeof Roles.tenantAdmin | typeof Roles.tenantViewer

const hasTenantRole = (user: User | null, role: TenantRole): boolean => {
  return Boolean(
    user?.tenants?.some(
      (tenantEntry) => Array.isArray(tenantEntry?.roles) && tenantEntry.roles.includes(role),
    ),
  )
}

// Allow access for super-admins or editors.
export const isSuperAdminOrEditor = ({ req: { user } }: AccessArgs): boolean =>
  isSuperAdmin(user) || hasTenantRole(user, Roles.tenantAdmin)

// Allow field access for super-admins or editors.
export const isSuperAdminOrEditorFieldAccess: FieldAccess = ({ req }): boolean => {
  return isSuperAdmin(req.user) || hasTenantRole(req.user, Roles.tenantAdmin)
}

// Allow reading users scoped to their tenant, with full access for super-admins.
export const usersReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantRole(user, Roles.tenantAdmin)) {
    const tenantIds = (user.tenants || [])
      .map((tenantEntry) => normalizeTenantId(tenantEntry.tenant))
      .filter((value): value is string | number => value !== undefined)
    const where: Where = {
      and: [{ 'tenants.tenant': { in: tenantIds } }, { deletedAt: { exists: false } }],
    }
    return where
  }
  return false
}

const getTenantFromReq = (req: AccessArgs['req']): unknown =>
  (req as { tenant?: unknown }).tenant

const getTenantAllowPublicRead = async ({
  req,
  tenantId,
}: {
  req: AccessArgs['req']
  tenantId: string | number
}): Promise<boolean> => {
  const tenantValue = getTenantFromReq(req)
  if (tenantValue && typeof tenantValue === 'object' && 'allowPublicRead' in tenantValue) {
    return Boolean(tenantValue.allowPublicRead)
  }

  const tenant = await req.payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 0,
  })

  return Boolean(tenant?.allowPublicRead)
}

export const tenantReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantRole(user, Roles.tenantAdmin)) {
    const tenantIds = (user.tenants || [])
      .map((tenantEntry) => normalizeTenantId(tenantEntry.tenant))
      .filter((value): value is string | number => value !== undefined)
    const where: Where = {
      and: [{ tenant: { in: tenantIds } }, { deletedAt: { exists: false } }],
    }
    return where
  }
  return false
}

export const tenantPublicReadAccess =
  ({ publishedOnly = false }: { publishedOnly?: boolean } = {}): Access =>
  async ({ req }) => {
  if (req.user) {
    return tenantReadAccess({ req })
  }

  const tenantId = normalizeTenantId(getTenantFromReq(req))
    if (!tenantId) return false

    const allowPublicRead = await getTenantAllowPublicRead({ req, tenantId })
    if (!allowPublicRead) return false

    const where: Where = {
      and: [
        { tenant: { equals: tenantId } },
        { deletedAt: { exists: false } },
        ...(publishedOnly ? [{ _status: { equals: 'published' } }] : []),
      ],
    }

    return where
  }

const hasTenant = (req: AccessArgs['req']): req is TenantRequest => 'tenant' in req

type UsersCreateAccessArgs = {
  req: AccessArgs['req'] & { tenant?: { id?: string } }
}

// Normalize tenant value to string or Id
// In admin UI, req.tenant is usually populated (object). In API calls, it might be just an ID (string/number).
export const normalizeTenantId = (value: unknown): string | number | undefined => {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = value.id
    if (typeof id === 'string' || typeof id === 'number') return id
  }
  return undefined
}

// Allow editors to create users only within their own tenant.
export const usersCreateAccess: Access = ({ req }: UsersCreateAccessArgs) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (!hasTenantRole(user, Roles.tenantAdmin)) return false

  const adminTenantIds = (user.tenants || [])
    .filter((tenantEntry) => Array.isArray(tenantEntry.roles) && tenantEntry.roles.includes(Roles.tenantAdmin))
    .map((tenantEntry) => normalizeTenantId(tenantEntry.tenant))
    .filter((value): value is string | number => value !== undefined)

  if (adminTenantIds.length === 0) return false

  const tenantId = normalizeTenantId(getTenantFromReq(req))
  if (tenantId) {
    return adminTenantIds.includes(tenantId)
  }

  // Allow create when the user only has one tenant-admin assignment and no tenant context is set.
  return adminTenantIds.length === 1
}

// Allow bootstrapping the very first user without an authenticated session.
export const usersBootstrapCreateAccess: Access = async ({ req }) => {
  if (req.user) {
    return usersCreateAccess({ req })
  }

  const existingUsers = await req.payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
  })

  return existingUsers.totalDocs === 0
}
