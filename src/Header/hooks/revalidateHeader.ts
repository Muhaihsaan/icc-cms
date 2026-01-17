import { createTagRevalidationHook } from '@/hooks/revalidation-service'

export const revalidateHeader = createTagRevalidationHook({
  tag: 'global_header',
  logMessage: 'Revalidating header',
})
