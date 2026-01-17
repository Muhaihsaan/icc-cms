// Centralized collection slug constants
// Add new collections here when creating them, then run `payload generate:types`

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
} as const

export type CollectionSlug = (typeof Collections)[keyof typeof Collections]
