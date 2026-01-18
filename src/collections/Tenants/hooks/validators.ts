import type { Validate } from 'payload'
import { z } from 'zod'

const siblingDataSchema = z.object({
  allowedCollections: z.array(z.string()).optional(),
})

// Validate allowPublicRead only contains values from allowedCollections
export const validateAllowPublicRead: Validate = (value, { siblingData }) => {
  if (!Array.isArray(value) || value.length === 0) return true
  const parsed = siblingDataSchema.safeParse(siblingData)
  if (!parsed.success) return true
  const allowed = parsed.data.allowedCollections
  if (!allowed || allowed.length === 0) return true
  const invalid: string[] = []
  for (const v of value) {
    if (!allowed.includes(v)) invalid.push(v)
  }
  if (invalid.length > 0) {
    return `Remove: ${invalid.join(', ')} (not in allowedCollections)`
  }
  return true
}

// Validate at least one collection is selected
export const validateAllowedCollections: Validate = (value) => {
  if (!Array.isArray(value) || value.length === 0) {
    return 'At least one collection must be selected.'
  }
  return true
}
