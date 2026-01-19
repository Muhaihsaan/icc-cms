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

function computeSectionData(fields: z.infer<typeof sectionFieldSchema>[]): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  for (const field of fields) {
    if (!field.key) continue

    if (field.type === SectionFieldTypes.TEXT) {
      data[field.key] = field.textValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.TEXTAREA) {
      data[field.key] = field.textareaValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.RICH_TEXT) {
      data[field.key] = field.richTextValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.NUMBER) {
      data[field.key] = field.numberValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.DATE) {
      data[field.key] = field.dateValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.SELECT) {
      const options = field.selectOptions ?? []
      const values: string[] = []
      for (const opt of options) {
        values.push(opt.value)
      }
      data[field.key] = values
      continue
    }

    if (field.type === SectionFieldTypes.MEDIA) {
      data[field.key] = field.mediaValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.LINK) {
      data[field.key] = field.linkValue ?? null
      continue
    }

    if (field.type === SectionFieldTypes.ARRAY) {
      const items = field.arrayValue ?? []
      const values: unknown[] = []
      for (const item of items) {
        if (item.type === SectionFieldTypes.MEDIA) {
          values.push(item.media)
        } else {
          values.push(item.value)
        }
      }
      data[field.key] = values
      continue
    }
  }

  return data
}

export const computeSectionsDataHook: CollectionAfterReadHook = ({ doc }) => {
  if (!doc) return doc
  if (!doc.sections) return doc

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
