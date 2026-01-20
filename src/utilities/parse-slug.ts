import { z } from 'zod'

const slugSchema = z.object({ slug: z.string() })

export const parseSlug = (data: unknown): string => {
  const parsed = slugSchema.safeParse(data)
  if (!parsed.success) return ''
  return parsed.data.slug
}
