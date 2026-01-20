import { createTagRevalidationHook } from '@/payload-hooks/revalidation-service'

export const revalidateHeader = createTagRevalidationHook({
  tag: 'global_header',
  logMessage: 'Revalidating header',
})
