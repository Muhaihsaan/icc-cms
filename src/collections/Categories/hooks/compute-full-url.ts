import type { CollectionBeforeChangeHook, CollectionAfterReadHook } from 'payload'
import { z } from 'zod'
import { Collections } from '@/config'

const categorySchema = z.object({
  slug: z.string(),
  fullUrl: z.string().optional(),
})

const parentCategorySchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string().optional(),
  fullUrl: z.string().optional(),
})

/**
 * Computes the full URL path for a category based on its parent hierarchy.
 * Example: /parent-slug/child-slug
 */
export const computeFullUrlHook: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data) return data

  const parsed = categorySchema.safeParse(data)
  if (!parsed.success) return data

  const slug = parsed.data.slug

  // If no parent, URL is just the slug
  if (!data.parent) {
    data.fullUrl = `/${slug}`
    return data
  }

  // Get parent ID
  const parentIdSchema = z.union([z.string(), z.number()])
  const parentObjSchema = z.object({ id: z.union([z.string(), z.number()]) })

  let parentId: string | number | undefined
  const directParsed = parentIdSchema.safeParse(data.parent)
  if (directParsed.success) {
    parentId = directParsed.data
  } else {
    const objParsed = parentObjSchema.safeParse(data.parent)
    if (objParsed.success) {
      parentId = objParsed.data.id
    }
  }

  if (!parentId) {
    data.fullUrl = `/${slug}`
    return data
  }

  // Fetch parent to get its fullUrl
  const parent = await req.payload.findByID({
    collection: Collections.CATEGORIES,
    id: parentId,
    depth: 0,
  })

  const parentParsed = parentCategorySchema.safeParse(parent)
  if (!parentParsed.success) {
    data.fullUrl = `/${slug}`
    return data
  }

  // Use parent's fullUrl or construct from parent slug
  const parentUrl = parentParsed.data.fullUrl || `/${parentParsed.data.slug || ''}`
  data.fullUrl = `${parentUrl}/${slug}`

  return data
}

/**
 * Computes the full URL on read for display purposes.
 * This ensures the URL is always shown even if not saved yet.
 */
export const computeFullUrlAfterReadHook: CollectionAfterReadHook = async ({ doc, req }) => {
  if (!doc) return doc

  const slug = doc.slug
  if (!slug) return doc

  // If fullUrl already exists and is valid, return as-is
  if (doc.fullUrl) return doc

  // If no parent, URL is just the slug
  if (!doc.parent) {
    doc.fullUrl = `/${slug}`
    return doc
  }

  // Get parent ID
  const parentIdSchema = z.union([z.string(), z.number()])
  const parentObjSchema = z.object({ id: z.union([z.string(), z.number()]) })

  let parentId: string | number | undefined
  const directParsed = parentIdSchema.safeParse(doc.parent)
  if (directParsed.success) {
    parentId = directParsed.data
  } else {
    const objParsed = parentObjSchema.safeParse(doc.parent)
    if (objParsed.success) {
      parentId = objParsed.data.id
    }
  }

  if (!parentId) {
    doc.fullUrl = `/${slug}`
    return doc
  }

  // Fetch parent to get its fullUrl
  const parent = await req.payload.findByID({
    collection: Collections.CATEGORIES,
    id: parentId,
    depth: 0,
  })

  const parentParsed = parentCategorySchema.safeParse(parent)
  if (!parentParsed.success) {
    doc.fullUrl = `/${slug}`
    return doc
  }

  // Use parent's fullUrl or construct from parent slug
  const parentUrl = parentParsed.data.fullUrl || `/${parentParsed.data.slug || ''}`
  doc.fullUrl = `${parentUrl}/${slug}`

  return doc
}
