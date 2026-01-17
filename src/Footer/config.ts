import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideForTopLevelMode,
} from '@/access'
import { Collections } from '@/config/collections'
import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: CollectionConfig = {
  slug: 'footer',
  trash: true,
  admin: {
    hidden: ({ user }) => shouldHideForTopLevelMode(user),
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.FOOTER),
    create: withTenantCollectionAccess(Collections.FOOTER, tenantAdminUpdateAccess),
    delete: tenantAdminUpdateAccess, // Both admins can soft-delete (Trash tab hidden for tenant-admin)
    read: withTenantCollectionAccess(Collections.FOOTER, tenantPublicReadAccess(Collections.FOOTER)),
    update: withTenantCollectionAccess(Collections.FOOTER, tenantAdminUpdateAccess),
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
    afterChange: [revalidateFooter],
  },
}
