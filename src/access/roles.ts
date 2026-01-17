export const Roles = {
  superAdmin: 'super-admin',
  superEditor: 'super-editor',
  tenantAdmin: 'tenant-admin',
  tenantViewer: 'tenant-viewer',
  guestWriter: 'guest-writer',
} as const

export type Role = (typeof Roles)[keyof typeof Roles]
