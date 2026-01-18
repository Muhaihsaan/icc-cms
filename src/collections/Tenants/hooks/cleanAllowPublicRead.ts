import type { CollectionBeforeChangeHook } from 'payload'

// Auto-clean allowPublicRead when allowedCollections changes
// Filters allowPublicRead to only include values that are in allowedCollections
export const cleanAllowPublicRead: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data
  const allowed = data.allowedCollections
  const publicRead = data.allowPublicRead
  // Filter allowPublicRead to only valid options from allowedCollections
  if (Array.isArray(publicRead) && Array.isArray(allowed)) {
    return { ...data, allowPublicRead: publicRead.filter((v) => allowed.includes(v)) }
  }
  return data
}
