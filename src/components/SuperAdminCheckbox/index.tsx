'use client'

import { CheckboxField, useField } from '@payloadcms/ui'
import type { CheckboxFieldClientProps } from 'payload'
import { z } from 'zod'

import { Roles } from '@/access'

const rolesArraySchema = z.array(z.string())
const rolesStringSchema = z.string()

const SuperAdminCheckbox: React.FC<CheckboxFieldClientProps> = (props) => {
  const { path } = props
  const { value, setValue } = useField<string[] | string>({ path })

  // Handle both array and string formats using Zod
  const arrayParsed = rolesArraySchema.safeParse(value)
  const stringParsed = rolesStringSchema.safeParse(value)

  const isChecked = arrayParsed.success
    ? arrayParsed.data.includes(Roles.superAdmin)
    : stringParsed.success && stringParsed.data === Roles.superAdmin

  return (
    <CheckboxField
      {...props}
      field={{
        ...props.field,
        label: 'Super Admin',
      }}
      checked={isChecked}
      onChange={(checked: boolean) => {
        setValue(checked ? [Roles.superAdmin] : [])
      }}
    />
  )
}

export default SuperAdminCheckbox
