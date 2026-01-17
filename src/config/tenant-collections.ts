import { Collections } from './collections'

// Collections that are managed per-tenant and can be toggled in tenant settings
export const tenantManagedCollections = [
  Collections.PAGES,
  Collections.POSTS,
  Collections.MEDIA,
  Collections.CATEGORIES,
  Collections.HEADER,
  Collections.FOOTER,
] as const

export type TenantManagedCollection = (typeof tenantManagedCollections)[number]

// Collections hidden from dashboard when "Top Level" is selected (includes search)
export const tenantScopedDashboardCollections = [
  ...tenantManagedCollections,
  Collections.SEARCH,
] as const

export type TenantScopedDashboardCollection = (typeof tenantScopedDashboardCollections)[number]

// Generate CSS selector to hide tenant-scoped collection cards
export const generateHiddenCollectionsCss = (collections: readonly string[]): string => {
  const selectors = collections.map((c) => `.dashboard__card-list li:has(#card-${c})`)
  return `${selectors.join(',\n')} {
  display: none !important;
}`
}
