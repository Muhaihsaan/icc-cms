export const Roles = {
  superAdmin: 'super-admin',
  superEditor: 'super-editor',
  tenantAdmin: 'tenant-admin',
  /**
   * Tenant-user role is for frontend authentication purposes.
   * Users with this role can log in to the tenant's frontend application
   * but do NOT have access to the admin panel (/admin).
   */
  tenantUser: 'tenant-user',
  guestWriter: 'guest-writer',
} as const

export type Role = (typeof Roles)[keyof typeof Roles]
