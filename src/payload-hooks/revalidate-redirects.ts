import { createTagRevalidationHook } from '@/payload-hooks/revalidation-service'
import { Collections } from '@/config'

export const revalidateRedirects = createTagRevalidationHook({
  tag: Collections.REDIRECTS,
  logMessage: 'Revalidating redirects',
  checkDisableRevalidate: false,
})
