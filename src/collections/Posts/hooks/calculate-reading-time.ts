import type { CollectionBeforeChangeHook } from 'payload'
import { z } from 'zod'

const textNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const nodeWithChildrenSchema = z.object({
  children: z.array(z.unknown()),
})

const rootNodeSchema = z.object({
  root: z.unknown(),
})

function extractTextFromLexical(node: unknown): string {
  if (!node) return ''

  const textParsed = textNodeSchema.safeParse(node)
  if (textParsed.success) {
    return textParsed.data.text
  }

  const rootParsed = rootNodeSchema.safeParse(node)
  if (rootParsed.success) {
    return extractTextFromLexical(rootParsed.data.root)
  }

  const childrenParsed = nodeWithChildrenSchema.safeParse(node)
  if (childrenParsed.success) {
    let result = ''
    for (const child of childrenParsed.data.children) {
      result += extractTextFromLexical(child) + ' '
    }
    return result
  }

  return ''
}

function calculateReadingTime(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 1

  let wordCount = 0
  const words = trimmed.split(/\s+/)
  for (const word of words) {
    if (word) wordCount++
  }

  const wordsPerMinute = 200
  const minutes = Math.ceil(wordCount / wordsPerMinute)
  return minutes < 1 ? 1 : minutes
}

export const calculateReadingTimeHook: CollectionBeforeChangeHook = ({ data }) => {
  if (!data) return data
  if (!data.content) return data

  const text = extractTextFromLexical(data.content)
  data.readingTime = calculateReadingTime(text)
  return data
}
