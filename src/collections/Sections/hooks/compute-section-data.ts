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

const fieldsArraySchema = z.array(sectionFieldSchema)

export const computeSectionDataHook: CollectionAfterReadHook = ({ doc }) => {
  if (!doc) return doc

  const fieldsParsed = fieldsArraySchema.safeParse(doc.fields)
  if (!fieldsParsed.success) return doc

  const data: Record<string, unknown> = {}

  for (const field of fieldsParsed.data) {
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

  doc.data = data
  return doc
}
