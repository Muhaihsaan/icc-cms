'use client'
import { RowLabelProps, useRowLabel } from '@payloadcms/ui'

type NavItemData = {
  link?: { label?: string }
}

export const RowLabel: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NavItemData>()

  const label = data?.data?.link?.label
    ? `Nav item ${data.rowNumber !== undefined ? data.rowNumber + 1 : ''}: ${data?.data?.link?.label}`
    : 'Row'

  return <div>{label}</div>
}
