import type { CollectionAfterReadHook } from 'payload'
import { z } from 'zod'
import { SectionFieldTypes } from '@/config'

const selectOptionSchema = z.object({
  value: z.string(),
})

const arrayItemSchema = z.object({
  type: z.string(),
  value: z.string().optional(),
  media: z.unknown().optional(),
})

const sectionFieldSchema = z.object({
  key: z.string(),
  type: z.string(),
  textValue: z.string().nullish(),
  textareaValue: z.string().nullish(),
  richTextValue: z.unknown().nullish(),
  numberValue: z.number().nullish(),
  dateValue: z.string().nullish(),
  selectOptions: z.array(selectOptionSchema).nullish(),
  mediaValue: z.unknown().nullish(),
  linkValue: z.unknown().nullish(),
  arrayValue: z.array(arrayItemSchema).nullish(),
})

const sectionSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  fields: z.array(sectionFieldSchema),
})

const sectionsArraySchema = z.array(sectionSchema)

// Maps field type to its value field name
const fieldValueMap: Record<string, keyof z.infer<typeof sectionFieldSchema>> = {
  [SectionFieldTypes.TEXT]: 'textValue',
  [SectionFieldTypes.TEXTAREA]: 'textareaValue',
  [SectionFieldTypes.RICH_TEXT]: 'richTextValue',
  [SectionFieldTypes.NUMBER]: 'numberValue',
  [SectionFieldTypes.DATE]: 'dateValue',
  [SectionFieldTypes.MEDIA]: 'mediaValue',
  [SectionFieldTypes.LINK]: 'linkValue',
}

function computeSectionData(fields: z.infer<typeof sectionFieldSchema>[]): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  for (const field of fields) {
    if (!field.key) continue

    // Handle simple field types via mapping
    const valueField = fieldValueMap[field.type]
    if (valueField) {
      data[field.key] = field[valueField] ?? null
      continue
    }

    // Handle select - extract values from options array
    if (field.type === SectionFieldTypes.SELECT) {
      data[field.key] = (field.selectOptions ?? []).map((opt) => opt.value)
      continue
    }

    // Handle array - extract value or media based on item type
    if (field.type === SectionFieldTypes.ARRAY) {
      data[field.key] = (field.arrayValue ?? []).map((item) =>
        item.type === SectionFieldTypes.MEDIA ? item.media : item.value,
      )
      continue
    }
  }

  return data
}

export const computeSectionsDataHook: CollectionAfterReadHook = ({ doc, req }) => {
  if (!doc) return doc
  if (!doc.sections) return doc

  // Only compute for REST/GraphQL API requests (frontend consumption)
  // Skip for local API calls (admin panel) to prevent infinite re-render with autosave
  if (req.payloadAPI === 'local') return doc

  const sectionsParsed = sectionsArraySchema.safeParse(doc.sections)
  if (!sectionsParsed.success) return doc

  const sectionsWithData = []
  for (const section of sectionsParsed.data) {
    sectionsWithData.push({
      ...section,
      data: computeSectionData(section.fields),
    })
  }

  doc.sections = sectionsWithData
  return doc
}
