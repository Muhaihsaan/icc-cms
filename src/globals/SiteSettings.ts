import type { GlobalConfig } from 'payload'

import { isSuperAdminAccess } from '@/access'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  access: {
    read: () => true,
    update: isSuperAdminAccess,
  },
  admin: {
    group: 'Administrative',
  },
  fields: [
    {
      name: 'industries',
      type: 'array',
      label: 'Industry Categories',
      labels: { singular: 'Industry', plural: 'Industries' },
      admin: {
        description: 'Define industries that can be assigned to tenants',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: { placeholder: 'e.g., Food & Beverage' },
        },
        {
          name: 'value',
          type: 'text',
          required: true,
          admin: { placeholder: 'e.g., food-beverage' },
        },
      ],
    },
  ],
}
