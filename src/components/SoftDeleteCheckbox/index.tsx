'use client'

import { CheckboxField, useField } from '@payloadcms/ui'
import type { CheckboxFieldClientProps } from 'payload'

const SoftDeleteCheckbox: React.FC<CheckboxFieldClientProps> = (props) => {
  const { path } = props
  const { value, setValue } = useField<boolean>({ path })

  return (
    <CheckboxField
      {...props}
      field={{
        ...props.field,
        label: 'Soft Delete',
      }}
      checked={Boolean(value)}
      onChange={(checked: boolean) => {
        setValue(checked)
      }}
    />
  )
}

export default SoftDeleteCheckbox
