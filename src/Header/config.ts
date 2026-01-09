import type { CollectionConfig } from 'payload'

import {
  isSuperAdmin,
  tenantPublicReadAccess,
  tenantReadAccess,
  usersCreateAccess,
} from '@/access/accessPermission'
import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: CollectionConfig = {
  slug: 'header',
  access: {
    create: usersCreateAccess,
    read: tenantPublicReadAccess(),
    update: tenantReadAccess,
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
          RowLabel: '@/Header/RowLabel#RowLabel',
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
    afterChange: [revalidateHeader],
  },
}
