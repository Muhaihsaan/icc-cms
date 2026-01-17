export const DocStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const

export type DocStatusValue = (typeof DocStatus)[keyof typeof DocStatus]
