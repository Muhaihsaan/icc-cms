import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'
import { link } from '@/fields/link'
import { revalidateFooter } from './hooks/revalidateFooter'

export const Footer: CollectionConfig = {
  slug: 'footer',
  trash: true,
  admin: {
    group: 'Global Site Content',
    hidden: shouldHideCollection('footer'),
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.FOOTER),
    create: withTenantCollectionAccess(Collections.FOOTER, tenantAdminUpdateAccess),
    delete: withTenantCollectionAccess(Collections.FOOTER, tenantAdminUpdateAccess),
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
