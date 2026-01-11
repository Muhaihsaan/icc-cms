import type { CollectionBeforeChangeHook } from 'payload'

// automatically sets publishedAt to the current time only when a post is being published and doesn’t already have a publish date.
export const populatePublishedAt: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create' || operation === 'update') {
    const nextStatus = req.data?._status
    if (nextStatus === 'published' && req.data && !req.data.publishedAt) {
      return {
        ...data,
        publishedAt: new Date(),
      }
    }
  }

  return data
}
