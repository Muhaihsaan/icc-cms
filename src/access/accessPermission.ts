import type { Access, FieldAccess, Where } from 'payload'
import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'
import {
  getTenantAdminIds,
  getTenantFromReq,
  getTenantIds,
  normalizeTenantId,
} from '@/access/helpers'

type isAuthenticated = (args: AccessArgs<User>) => boolean

export const Roles = {
  superAdmin: 'super-admin',
  tenantAdmin: 'tenant-admin',
  tenantViewer: 'tenant-viewer',
  guestWriter: 'guest-writer',
} as const

// Collections that can be toggled per tenant.
export const tenantManagedCollections = [
  'pages',
  'posts',
  'media',
  'categories',
  'header',
  'footer',
] as const

type TenantManagedCollection = (typeof tenantManagedCollections)[number]

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

type TenantRole = typeof Roles.tenantAdmin | typeof Roles.tenantViewer | typeof Roles.guestWriter

// Check whether a user has a specific tenant role.
const hasTenantRole = (user: User | null, role: TenantRole): boolean => {
  return Boolean(
    user?.tenants?.some(
      (tenantEntry) => Array.isArray(tenantEntry?.roles) && tenantEntry.roles.includes(role),
    ),
  )
}

// Check whether a user has any tenant role.
const hasAnyTenantRole = (user: User | null): boolean => {
  return Boolean(
    user?.tenants?.some(
      (tenantEntry) => Array.isArray(tenantEntry?.roles) && tenantEntry.roles.length > 0,
    ),
  )
}

// Check whether a user can read tenant content.
const hasTenantReadRole = (user: User | null): boolean => {
  return (
    hasTenantRole(user, Roles.tenantAdmin) ||
    hasTenantRole(user, Roles.tenantViewer) ||
    hasTenantRole(user, Roles.guestWriter)
  )
}

// Check whether a user is a guest writer for any tenant.
const isGuestWriter = (user: User | null): boolean => hasTenantRole(user, Roles.guestWriter)

// True if the user is a super-admin or a tenant admin.
const isSuperAdminOrTenantAdmin = (user: User | null): boolean =>
  isSuperAdmin(user) || hasTenantRole(user, Roles.tenantAdmin)

// True if the user is a super-admin or has any tenant role.
export const isSuperAdminOrTenantMember = ({ req: { user } }: AccessArgs): boolean =>
  isSuperAdmin(user) || hasAnyTenantRole(user)

// Allow access for super-admins or tenant admins.
export const isSuperAdminOrEditor = ({ req: { user } }: AccessArgs): boolean =>
  isSuperAdminOrTenantAdmin(user)

// Allow field access for super-admins or tenant admins.
export const isSuperAdminOrEditorFieldAccess: FieldAccess = ({ req }): boolean => {
  return isSuperAdminOrTenantAdmin(req.user)
}

// Allow reading users scoped to their tenant, with full access for super-admins.
export const usersReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantRole(user, Roles.tenantAdmin)) {
    const tenantIds = getTenantIds(user)
    const where: Where = {
      and: [{ 'tenants.tenant': { in: tenantIds } }, { deletedAt: { exists: false } }],
    }
    return where
  }
  return false
}

// Read the allowed collections for a tenant. Returns null when not set.
const getTenantAllowedCollections = async (
  req: AccessArgs['req'],
  tenantId: string | number,
): Promise<TenantManagedCollection[] | null | undefined> => {
  let tenant
  try {
    tenant = await req.payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return undefined
  }

  if (!tenant) return undefined

  return Array.isArray(tenant.allowedCollections) ? tenant.allowedCollections : null
}

// Check whether the current tenant can access a given collection.
const isTenantCollectionAllowed = async ({
  req,
  collection,
}: {
  req: AccessArgs['req']
  collection: TenantManagedCollection
}): Promise<boolean> => {
  if (isSuperAdmin(req.user)) return true
  if (isGuestWriter(req.user)) return collection === 'posts'
  let tenantId = normalizeTenantId(getTenantFromReq(req))
  if (!tenantId && req.user) {
    const tenantIds = getTenantIds(req.user)
    if (tenantIds.length === 1) tenantId = tenantIds[0]
  }
  if (!tenantId) return true

  const allowedCollections = await getTenantAllowedCollections(req, tenantId)
  if (allowedCollections === undefined) return false
  if (!allowedCollections || allowedCollections.length === 0) return true

  return allowedCollections.includes(collection)
}

// Wrap an access function with tenant collection checks.
export const withTenantCollectionAccess = (
  collection: TenantManagedCollection,
  access: Access,
): Access => {
  return async (args) => {
    const allowed = await isTenantCollectionAllowed({ req: args.req, collection })
    if (!allowed) return false
    return access(args)
  }
}

// Allow admin UI access based on allowed collections.
export const tenantCollectionAdminAccess =
  (collection: TenantManagedCollection) =>
  async ({ req }: { req: AccessArgs['req'] }) =>
    isTenantCollectionAllowed({ req, collection })

// Allow reading tenants scoped to tenant assignments, with full access for super-admins.
export const tenantsReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true

  const tenantIds = getTenantIds(user)
  if (tenantIds.length === 0) return false

  return {
    id: { in: tenantIds },
  }
}

// Allow updating tenants only for tenant admins and super-admins.
export const tenantsUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true

  const tenantIds = getTenantAdminIds(user)
  if (tenantIds.length === 0) return false

  return {
    id: { in: tenantIds },
  }
}

// Fetch whether a tenant allows public read.
const getTenantAllowPublicRead = async ({
  req,
  tenantId,
}: {
  req: AccessArgs['req']
  tenantId: string | number
}): Promise<boolean> => {
  let tenant
  try {
    tenant = await req.payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 0,
      overrideAccess: true,
    })
  } catch {
    return false
  }

  return Boolean(tenant?.allowPublicRead)
}

// Allow read access to tenant-scoped documents for tenant members.
export const tenantMemberReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantReadRole(user)) {
    const tenantIds = getTenantIds(user)
    const where: Where = {
      and: [{ tenant: { in: tenantIds } }, { deletedAt: { exists: false } }],
    }
    return where
  }
  return false
}

// Allow update access to tenant-scoped documents for tenant admins and super-admins.
export const tenantReadAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantRole(user, Roles.tenantAdmin)) {
    const tenantIds = getTenantIds(user)
    const where: Where = {
      and: [{ tenant: { in: tenantIds } }, { deletedAt: { exists: false } }],
    }
    return where
  }
  return false
}

// Allow public read for tenant content when the tenant allows it.
export const tenantPublicReadAccess =
  ({ publishedOnly = false }: { publishedOnly?: boolean } = {}): Access =>
  async ({ req }) => {
    if (req.user) {
      return tenantMemberReadAccess({ req })
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

// Allow tenant-admins to create users only within their own tenant.
export const usersCreateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (!hasTenantRole(user, Roles.tenantAdmin)) return false

  const adminTenantIds = getTenantIds(user).filter((tenantId) =>
    user.tenants?.some(
      (tenantEntry) =>
        normalizeTenantId(tenantEntry.tenant) === tenantId &&
        Array.isArray(tenantEntry.roles) &&
        tenantEntry.roles.includes(Roles.tenantAdmin),
    ),
  )

  if (adminTenantIds.length === 0) return false

  const tenantId = normalizeTenantId(getTenantFromReq(req))
  if (tenantId) {
    return adminTenantIds.includes(tenantId)
  }

  // Allow create when the user only has one tenant-admin assignment and no tenant context is set.
  return adminTenantIds.length === 1
}

// Allow tenant admins and guest writers to create posts with limits.
export const postsCreateAccess: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantRole(user, Roles.tenantAdmin)) return true
  if (!hasTenantRole(user, Roles.guestWriter)) return false

  const tenantId = normalizeTenantId(getTenantFromReq(req))
  if (!tenantId) return false
  const tenantIds = getTenantIds(user)
  if (!tenantIds.includes(tenantId)) return false

  const userDoc = await req.payload.findByID({
    collection: 'users',
    id: user.id,
    depth: 0,
    overrideAccess: true,
  })
  const limit = typeof userDoc?.guestWriterPostLimit === 'number' ? userDoc.guestWriterPostLimit : 1
  if (limit <= 0) return false

  const where: Where = {
    and: [
      { authors: { contains: user.id } },
      {
        or: [{ _status: { equals: 'published' } }, { publishedAt: { exists: true } }],
      },
    ],
  }

  const { totalDocs } = await req.payload.count({
    collection: 'posts',
    overrideAccess: true,
    req: undefined,
    where,
  })

  return totalDocs < limit
}

// Allow tenant admins and guest writers to update posts they authored.
export const postsUpdateAccess: Access = ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isSuperAdmin(user)) return true
  if (hasTenantRole(user, Roles.tenantAdmin)) {
    const tenantIds = getTenantIds(user)
    const where: Where = {
      and: [{ tenant: { in: tenantIds } }, { deletedAt: { exists: false } }],
    }
    return where
  }
  if (!hasTenantRole(user, Roles.guestWriter)) return false

  const where: Where = {
    and: [{ authors: { contains: user.id } }, { deletedAt: { exists: false } }],
  }
  return where
}

// Temporary Solution for First User Creation
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
