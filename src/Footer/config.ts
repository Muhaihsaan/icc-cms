import type { CollectionConfig } from 'payload'

import {
  isSuperAdmin,
  tenantPublicReadAccess,
  tenantReadAccess,
  tenantCollectionAdminAccess,
  usersCreateAccess,
  withTenantCollectionAccess,
} from '@/access/accessPermission'
import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: CollectionConfig = {
  slug: 'footer',
  access: {
    admin: tenantCollectionAdminAccess('footer'),
    create: withTenantCollectionAccess('footer', usersCreateAccess),
    read: withTenantCollectionAccess('footer', tenantPublicReadAccess()),
    update: withTenantCollectionAccess('footer', tenantReadAccess),
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
          RowLabel: '@/Footer/RowLabel#RowLabel',
        },
      },
    },
    {
      name: 'deletedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        condition: (_data, _siblingData, { user }) => isSuperAdmin(user),
      },
    },
  ],
  hooks: {
    afterChange: [revalidateFooter],
  },
}
