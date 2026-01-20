'use client'

import { SelectField, useField } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'
import { useEffect, useState } from 'react'
import { z } from 'zod'

const industrySchema = z.object({
  label: z.string(),
  value: z.string(),
})

const siteSettingsSchema = z.object({
  industries: z.array(industrySchema).optional().default([]),
})

const stringSchema = z.string()
const stringArraySchema = z.array(z.string())

type IndustryOption = z.infer<typeof industrySchema>

export const IndustrySelectField: React.FC<TextFieldClientProps> = (props) => {
  const { path, field } = props
  const { value, setValue } = useField<string>({ path })
  const [options, setOptions] = useState<IndustryOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const res = await fetch('/api/globals/site-settings')
        const data: unknown = await res.json()
        const parsed = siteSettingsSchema.safeParse(data)
        if (!parsed.success) return
        setOptions(parsed.data.industries)
      } catch (error) {
        console.error('Failed to fetch industries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchIndustries()
  }, [])

  const selectOptions: { label: string; value: string }[] = []
  for (const opt of options) {
    selectOptions.push({ label: opt.label, value: opt.value })
  }

  return (
    <SelectField
      field={{
        name: field.name,
        label: field.label ?? 'Industry',
        type: 'select',
        options: selectOptions,
        admin: {
          description: loading ? 'Loading industries...' : field.admin?.description,
          isClearable: true,
          isSortable: false,
          placeholder: 'Select an industry',
        },
      }}
      path={path}
      value={value}
      onChange={(val) => {
        const stringResult = stringSchema.safeParse(val)
        if (stringResult.success) {
          setValue(stringResult.data)
          return
        }

        const arrayResult = stringArraySchema.safeParse(val)
        if (arrayResult.success) {
          const first = arrayResult.data[0]
          if (!first) {
            setValue('')
            return
          }
          setValue(first)
          return
        }

        setValue('')
      }}
    />
  )
}
