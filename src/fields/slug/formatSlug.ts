import type { FieldHook } from 'payload'
import { z } from 'zod'

const stringSchema = z.string()

export const formatSlug = (val: string): string | undefined =>
  val
    ?.replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .toLowerCase()

export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    const valueParsed = stringSchema.safeParse(value)
    if (valueParsed.success) {
      return formatSlug(valueParsed.data)
    }

    if (operation === 'create' || data?.slug === undefined) {
      const fallbackData = data?.[fallback]

      const fallbackParsed = stringSchema.safeParse(fallbackData)
      if (fallbackParsed.success) {
        return formatSlug(fallbackParsed.data)
      }
    }

    return value
  }
