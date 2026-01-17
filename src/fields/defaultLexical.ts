import type { TextFieldSingleValidation } from 'payload'
import {
  BoldFeature,
  ItalicFeature,
  LinkFeature,
  ParagraphFeature,
  lexicalEditor,
  UnderlineFeature,
} from '@payloadcms/richtext-lexical'
import { z } from 'zod'
import { Collections } from '@/config/collections'

const namedFieldSchema = z.object({ name: z.string() })
const linkFieldsSchema = z.object({ linkType: z.string().optional() })

const validateUrl: TextFieldSingleValidation = (value, options) => {
  const siblingResult = linkFieldsSchema.safeParse(options?.siblingData)
  if (siblingResult.success && siblingResult.data.linkType === 'internal') {
    return true // no validation needed, url should not exist for internal links
  }
  return value ? true : 'URL is required'
}

export const defaultLexical = lexicalEditor({
  features: [
    ParagraphFeature(),
    UnderlineFeature(),
    BoldFeature(),
    ItalicFeature(),
    LinkFeature({
      enabledCollections: [Collections.PAGES, Collections.POSTS],
      fields: ({ defaultFields }) => {
        const defaultFieldsWithoutUrl = defaultFields.filter((field) => {
          const result = namedFieldSchema.safeParse(field)
          if (result.success && result.data.name === 'url') return false
          return true
        })

        return [
          ...defaultFieldsWithoutUrl,
          {
            name: 'url',
            type: 'text',
            admin: {
              condition: (_data, siblingData) => siblingData?.linkType !== 'internal',
            },
            label: ({ t }) => t('fields:enterURL'),
            required: true,
            validate: validateUrl,
          },
        ]
      },
    }),
  ],
})
