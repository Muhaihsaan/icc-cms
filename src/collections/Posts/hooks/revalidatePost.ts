import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache'

import type { Post } from '@/payload-types'
import { DocStatus } from '@/config/doc-status'

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context?.disableRevalidate) return doc

  if (doc._status === DocStatus.PUBLISHED) {
    const path = `/posts/${doc.slug}`

    payload.logger.info(`Revalidating post: ${path}`)

    revalidatePath(path)
    revalidateTag('posts-sitemap')
  }

  // If the post was previously published, we need to revalidate the old path
  if (previousDoc._status === DocStatus.PUBLISHED && doc._status !== DocStatus.PUBLISHED) {
    const oldPath = `/posts/${previousDoc.slug}`

    payload.logger.info(`Revalidating old post: ${oldPath}`)

    revalidatePath(oldPath)
    revalidateTag('posts-sitemap')
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
  if (context?.disableRevalidate) return doc

  const path = `/posts/${doc?.slug}`

  revalidatePath(path)
  revalidateTag('posts-sitemap')

  return doc
}
