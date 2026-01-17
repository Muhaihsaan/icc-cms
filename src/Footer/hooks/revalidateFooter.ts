import { createTagRevalidationHook } from '@/hooks/revalidation-service'

export const revalidateFooter = createTagRevalidationHook({
  tag: 'global_footer',
  logMessage: 'Revalidating footer',
})
