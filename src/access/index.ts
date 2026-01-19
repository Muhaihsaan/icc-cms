// Re-export everything for backward compatibility with accessPermission.ts imports

// Roles
export { Roles } from '@/access/helpers'
export type { Role } from '@/access/helpers'

// Tenant data utilities
export { getUserTenantData, getTenantAllowedCollections, getTenantAllowPublicRead, getEffectiveTenant } from '@/access/helpers'
export type { UserTenantData } from '@/access/helpers'

// Role checks
export {
  isSuperAdmin,
  isSuperEditor,
  isTopLevelUser,
  isSuperAdminAccess,
  isSuperAdminFieldAccess,
  isSuperAdminOrBootstrapFieldAccess,
  isSuperAdminOrTenantMember,
  isSuperAdminOrEditor,
  isSuperAdminOrEditorFieldAccess,
  hasAdminPanelAccess,
  usersCollectionAdminAccess,
  notGuestWriterFieldAccess,
} from '@/access/role-checks'

// Client-side checks (for admin.hidden)
export { shouldHideForTopLevelMode, shouldHideCollection, shouldHideUsersCollection } from '@/access/client-checks'

// Base access patterns
export { anyone, authenticated, authenticatedOrPublished } from '@/access/base-access'

// Tenant-scoped access patterns
export {
  whereNoAccess,
  whereTenantScoped,
  isTenantCollectionAllowed,
  withTenantCollectionAccess,
  tenantCollectionAdminAccess,
  tenantMemberReadAccess,
  tenantAdminUpdateAccess,
  tenantPublicReadAccess,
} from '@/access/tenant-scoped'

// Collection-specific access: Users
export {
  usersReadAccess,
  usersUpdateAccess,
  usersCreateAccess,
  usersBootstrapCreateAccess,
  usersDeleteAccess,
} from '@/access/collections/users'

// Collection-specific access: Posts
export { postsCreateAccess, postsUpdateAccess, postsDeleteAccess, postsReadAccess } from '@/access/collections/posts'

// Collection-specific access: Tenants
export { tenantsReadAccess, tenantsUpdateAccess } from '@/access/collections/tenants'

// Re-export tenant collections config for backward compatibility
export { tenantManagedCollections, type TenantManagedCollection } from '@/config'
