'use client'

import { useField } from '@payloadcms/ui'
import type { FieldLabelClientProps } from 'payload'
import { tenantManagedCollections } from '@/config'
import { z } from 'zod'

const stringArraySchema = z.array(z.string())

export const AllowedCollectionsLabel: React.FC<FieldLabelClientProps> = (props) => {
  const { setValue } = useField<string[]>({ path: props.path })

  const handleSelectAll = () => {
    setValue([...tenantManagedCollections])
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <label className="field-label">
        Allowed Collections
        <span className="required">*</span>
      </label>
      <button
        type="button"
        onClick={handleSelectAll}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--theme-elevation-800)',
          cursor: 'pointer',
          fontSize: '13px',
          padding: 0,
          textDecoration: 'none',
          marginTop: '-2px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none'
        }}
      >
        select all
      </button>
    </div>
  )
}

export const AllowPublicReadLabel: React.FC<FieldLabelClientProps> = (props) => {
  const { setValue } = useField<string[]>({ path: props.path })
  const { value: allowedCollections } = useField<string[]>({ path: 'allowedCollections' })

  const handleSelectAll = () => {
    const parsed = stringArraySchema.safeParse(allowedCollections)
    if (!parsed.success) return
    if (parsed.data.length === 0) return
    setValue([...parsed.data])
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <label className="field-label">Allow Public Read</label>
      <button
        type="button"
        onClick={handleSelectAll}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--theme-elevation-800)',
          cursor: 'pointer',
          fontSize: '13px',
          padding: 0,
          textDecoration: 'none',
          marginTop: '-2px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.textDecoration = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.textDecoration = 'none'
        }}
      >
        select all
      </button>
    </div>
  )
}
