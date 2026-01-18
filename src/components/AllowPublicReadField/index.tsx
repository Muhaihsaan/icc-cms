'use client'

import { SelectField, useField, useFormFields } from '@payloadcms/ui'
import type { Option, SelectFieldClientProps } from 'payload'
import { z } from 'zod'

const stringArraySchema = z.array(z.string())
const optionObjectSchema = z.object({ value: z.string() })

const getOptionValue = (opt: Option): string | null => {
  const stringResult = z.string().safeParse(opt)
  if (stringResult.success) return stringResult.data
  const objectResult = optionObjectSchema.safeParse(opt)
  if (objectResult.success) return objectResult.data.value
  return null
}

const filterOptions = (options: Option[], allowed: string[]): Option[] => {
  const filtered: Option[] = []
  for (const opt of options) {
    const value = getOptionValue(opt)
    if (value && allowed.includes(value)) filtered.push(opt)
  }
  return filtered
}

const filterValues = (values: string[], allowed: string[]): string[] => {
  const filtered: string[] = []
  for (const v of values) {
    if (allowed.includes(v)) filtered.push(v)
  }
  return filtered
}

export const AllowPublicReadField: React.FC<SelectFieldClientProps> = (props) => {
  const { path, field } = props

  // Get current value of allowedCollections from form state
  const allowedCollections = useFormFields(([fields]) => {
    const allowedField = fields?.allowedCollections
    const parsed = stringArraySchema.safeParse(allowedField?.value)
    if (!parsed.success) return undefined
    return parsed.data
  })

  // Filter options based on allowedCollections
  const filteredOptions =
    allowedCollections && allowedCollections.length > 0
      ? filterOptions(field.options || [], allowedCollections)
      : []

  // Use the field hook to manage value
  const { value, setValue } = useField<string[]>({ path })

  // Auto-clean value when allowedCollections changes
  const parsedValue = stringArraySchema.safeParse(value)
  const cleanedValue =
    parsedValue.success && allowedCollections
      ? filterValues(parsedValue.data, allowedCollections)
      : []

  return (
    <SelectField
      {...props}
      field={{
        ...field,
        options: filteredOptions,
      }}
      value={cleanedValue}
      onChange={(val) => {
        const parsed = stringArraySchema.safeParse(val)
        if (parsed.success) setValue(parsed.data)
      }}
    />
  )
}
