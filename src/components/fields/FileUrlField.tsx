'use client'

import { useDocumentInfo, FieldLabel, CopyToClipboard } from '@payloadcms/ui'

export const FileUrlField = () => {
  const { initialData } = useDocumentInfo()
  const url = initialData?.url as string | undefined

  return (
    <div className="field-type ui" style={{ marginBottom: '24px' }}>
      <FieldLabel label="File URL" />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px',
          backgroundColor: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: '4px',
          marginTop: '8px',
        }}
      >
        {url ? (
          <>
            <code
              style={{
                fontSize: '13px',
                wordBreak: 'break-all',
                flex: 1,
                fontFamily: 'var(--font-mono)',
              }}
            >
              {url}
            </code>
            <CopyToClipboard value={url} />
          </>
        ) : (
          <span style={{ color: 'var(--theme-elevation-400)', fontSize: '13px' }}>
            Upload a file to see URL
          </span>
        )}
      </div>
    </div>
  )
}
