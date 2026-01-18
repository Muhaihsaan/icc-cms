// Centralized configuration constants

// Collection slug constants
export const Collections = {
  PAGES: 'pages',
  POSTS: 'posts',
  MEDIA: 'media',
  CATEGORIES: 'categories',
  USERS: 'users',
  TENANTS: 'tenants',
  HEADER: 'header',
  FOOTER: 'footer',
  REDIRECTS: 'redirects',
  FORMS: 'forms',
  FORM_SUBMISSIONS: 'form-submissions',
  SEARCH: 'search',
  SECTIONS: 'sections',
} as const

export type CollectionSlug = (typeof Collections)[keyof typeof Collections]

// Document status constants
export const DocStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const

// Section field types
export const SectionFieldTypes = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  RICH_TEXT: 'richText',
  NUMBER: 'number',
  DATE: 'date',
  SELECT: 'select',
  MEDIA: 'media',
  LINK: 'link',
  ARRAY: 'array',
} as const

export type SectionFieldType = (typeof SectionFieldTypes)[keyof typeof SectionFieldTypes]

export type DocStatusValue = (typeof DocStatus)[keyof typeof DocStatus]

// Collections that are managed per-tenant and can be toggled in tenant settings
export const tenantManagedCollections = [
  Collections.PAGES,
  Collections.POSTS,
  Collections.MEDIA,
  Collections.CATEGORIES,
  Collections.HEADER,
  Collections.FOOTER,
  Collections.SECTIONS,
] as const

export type TenantManagedCollection = (typeof tenantManagedCollections)[number]

// Collections hidden from dashboard when "Top Level" is selected (includes search)
export const tenantScopedDashboardCollections = [
  ...tenantManagedCollections,
  Collections.SEARCH,
] as const

export type TenantScopedDashboardCollection = (typeof tenantScopedDashboardCollections)[number]
