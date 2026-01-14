import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
} from '@/access/accessPermission'
import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: CollectionConfig = {
  slug: 'header',
  trash: true,
  access: {
    admin: tenantCollectionAdminAccess('header'),
    create: withTenantCollectionAccess('header', tenantAdminUpdateAccess),
    delete: tenantAdminUpdateAccess, // Both admins can soft-delete (Trash tab hidden for tenant-admin)
    read: withTenantCollectionAccess('header', tenantPublicReadAccess('header')),
    update: withTenantCollectionAccess('header', tenantAdminUpdateAccess),
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
        }),
      ],
      maxRows: 6,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/components/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
