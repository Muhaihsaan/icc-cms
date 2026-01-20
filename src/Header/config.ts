import type { CollectionConfig } from 'payload'

import {
  tenantPublicReadAccess,
  tenantAdminUpdateAccess,
  tenantAdminCreateAccess,
  tenantCollectionAdminAccess,
  withTenantCollectionAccess,
  shouldHideCollection,
} from '@/access'
import { Collections } from '@/config'
import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidate-header'

export const Header: CollectionConfig = {
  slug: 'header',
  trash: true,
  admin: {
    group: 'Global Site Content',
    hidden: shouldHideCollection('header'),
    useAsTitle: 'label',
  },
  access: {
    admin: tenantCollectionAdminAccess(Collections.HEADER),
    create: withTenantCollectionAccess(Collections.HEADER, tenantAdminCreateAccess),
    delete: withTenantCollectionAccess(Collections.HEADER, tenantAdminUpdateAccess),
    read: withTenantCollectionAccess(Collections.HEADER, tenantPublicReadAccess(Collections.HEADER)),
    update: withTenantCollectionAccess(Collections.HEADER, tenantAdminUpdateAccess),
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
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
          RowLabel: '@/components/RowLabel/row-label#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
