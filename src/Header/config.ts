import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config/collections'
import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: CollectionConfig = {
  slug: 'header',
  trash: true,
  admin: {
    hidden: shouldHideCollection('header'),
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.HEADER),
    create: withTenantCollectionAccess(Collections.HEADER, tenantAdminUpdateAccess),
    delete: withTenantCollectionAccess(Collections.HEADER, tenantAdminUpdateAccess),
    read: withTenantCollectionAccess(Collections.HEADER, tenantPublicReadAccess(Collections.HEADER)),
    update: withTenantCollectionAccess(Collections.HEADER, tenantAdminUpdateAccess),
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
