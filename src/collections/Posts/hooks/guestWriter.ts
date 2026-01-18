import type { CollectionBeforeChangeHook } from 'payload'

import { hasGuestWriterRole } from '@/access/helpers'
import { DocStatus } from '@/config/doc-status'
import type { Post } from '@/payload-types'

// Auto-assign guest writer as author of their own posts
export const assignGuestWriterAuthor: CollectionBeforeChangeHook<Post> = ({ req, data }) => {
  const user = req.user
  if (!user) return data
  if (!hasGuestWriterRole(user)) return data

  const nextData: Partial<Post> = data ?? {}

  return {
    ...nextData,
    authors: [user.id],
  }
}

// Prevent guest writers from publishing posts - force draft status
export const preventGuestWriterPublish: CollectionBeforeChangeHook<Post> = ({ req, data }) => {
  const user = req.user
  if (!user) return data
  if (!hasGuestWriterRole(user)) return data

  const nextData: Partial<Post> = data ?? {}

  // Force draft status and clear publishedAt for guest writers
  return {
    ...nextData,
    _status: DocStatus.DRAFT,
    publishedAt: null,
  }
}
