import { createTagRevalidationHook } from '@/hooks/revalidation-service'
import { Collections } from '@/config/collections'

export const revalidateRedirects = createTagRevalidationHook({
  tag: Collections.REDIRECTS,
  logMessage: 'Revalidating redirects',
  checkDisableRevalidate: false,
})
