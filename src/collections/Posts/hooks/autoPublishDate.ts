import type { FieldHook } from 'payload'

import { DocStatus } from '@/config/doc-status'

// Auto-set publishedAt to current date when post is published without a date
export const autoPublishDate: FieldHook = ({ siblingData, value }) => {
  if (siblingData._status === DocStatus.PUBLISHED && !value) {
    return new Date()
  }
  return value
}
