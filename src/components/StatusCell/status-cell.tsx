'use client'

import type { DefaultCellComponentProps } from 'payload'

export const StatusCell = ({ cellData }: DefaultCellComponentProps) => {
  const isPublished = cellData === 'published'
  const label = isPublished ? 'Approved' : 'Pending Review'

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: isPublished ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
        color: isPublished ? 'rgb(34, 197, 94)' : 'rgb(202, 138, 4)',
        border: `1px solid ${isPublished ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
      }}
    >
      {label}
    </span>
  )
}
