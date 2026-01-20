import { createTagRevalidationHook } from '@/payload-hooks/revalidation-service'

export const revalidateFooter = createTagRevalidationHook({
  tag: 'global_footer',
  logMessage: 'Revalidating footer',
})
