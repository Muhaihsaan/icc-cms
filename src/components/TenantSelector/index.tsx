'use client'

import { useAuth } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useEffect } from 'react'
import { z } from 'zod'

const Roles = {
  superAdmin: 'super-admin',
  superEditor: 'super-editor',
} as const

const userRolesSchema = z.object({
  roles: z.string().nullable().optional(),
})

const isTopLevelUser = (user: unknown): boolean => {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  const roles = parsed.data.roles
  if (!roles) return false
  return roles === Roles.superAdmin || roles === Roles.superEditor
}

const optionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
})
const optionsArraySchema = z.array(optionSchema)

export function TenantSelector(): React.ReactElement | null {
  const { user } = useAuth()
  const tenantSelection = useTenantSelection()

  const isTopLevel = isTopLevelUser(user)

  // Parse options from plugin
  const optionsParsed = optionsArraySchema.safeParse(tenantSelection?.options)
  const tenantOptions = optionsParsed.success ? optionsParsed.data : []

  const selectedTenantIdSchema = z.union([z.string(), z.number()]).optional()
  const selectedTenantIdParsed = selectedTenantIdSchema.safeParse(tenantSelection?.selectedTenantID)
  const selectedTenantId = selectedTenantIdParsed.success ? selectedTenantIdParsed.data : undefined

  const setTenant = tenantSelection?.setTenant

  // Top Level = no tenant selected
  const isTopLevelSelected = !selectedTenantId

  const handleTopLevelSelect = () => {
    setTenant?.({ id: undefined })
    document.cookie = 'payload-tenant=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }

  // Hide sidebar tenant selector since we show it here
  useEffect(() => {
    if (!isTopLevel) return

    const style = document.createElement('style')
    style.id = 'hide-sidebar-tenant'
    style.textContent = `.tenant-selector { display: none !important; }`
    document.head.appendChild(style)

    return () => {
      document.getElementById('hide-sidebar-tenant')?.remove()
    }
  }, [isTopLevel])

  // Hide collection cards based on selection
  useEffect(() => {
    if (!isTopLevel) return

    const styleId = 'hide-tenant-collections'

    // Always remove existing style first
    const existingStyle = document.getElementById(styleId)
    if (existingStyle) existingStyle.remove()

    // If "Top Level" is selected (no tenant), hide tenant-managed cards
    if (isTopLevelSelected) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Override grid to flexbox for proper reflow */
        .dashboard__card-list {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 24px !important;
        }
        .dashboard__card-list > li {
          flex: 0 0 calc(50% - 12px) !important;
          max-width: calc(50% - 12px) !important;
        }
        @media (max-width: 768px) {
          .dashboard__card-list > li {
            flex: 0 0 100% !important;
            max-width: 100% !important;
          }
        }
        /* Hide tenant-managed collection cards */
        .dashboard__card-list li:has(#card-pages),
        .dashboard__card-list li:has(#card-posts),
        .dashboard__card-list li:has(#card-media),
        .dashboard__card-list li:has(#card-categories),
        .dashboard__card-list li:has(#card-header),
        .dashboard__card-list li:has(#card-footer),
        .dashboard__card-list li:has(#card-search) {
          display: none !important;
        }
      `
      document.head.appendChild(style)

      return () => {
        const el = document.getElementById(styleId)
        if (el) el.remove()
      }
    }

    return undefined
  }, [isTopLevel, isTopLevelSelected])

  // Only show for top-level users
  if (!isTopLevel) return null

  // Description based on selection
  const description = isTopLevelSelected
    ? 'Managing top-level users and tenants.'
    : 'Use the sidebar Tenant selector to switch tenants.'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        backgroundColor: 'var(--theme-elevation-50)',
        borderRadius: '8px',
        border: '1px solid var(--theme-elevation-100)',
        gap: '1.5rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontWeight: 500, color: 'var(--theme-elevation-600)' }}>Scope:</span>

        <button
          onClick={handleTopLevelSelect}
          type="button"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: isTopLevelSelected ? 'var(--theme-success-500)' : 'var(--theme-elevation-200)',
            color: isTopLevelSelected ? 'white' : 'inherit',
            cursor: 'pointer',
            fontWeight: isTopLevelSelected ? 600 : 400,
            transition: 'all 0.15s ease',
          }}
        >
          Top Level
        </button>

        <select
          value={selectedTenantId ? String(selectedTenantId) : ''}
          onChange={(e) => {
            const val = e.target.value
            if (!val) return

            // Parse as number if numeric, otherwise keep as string
            const numSchema = z.coerce.number()
            const numParsed = numSchema.safeParse(val)
            const id = numParsed.success ? numParsed.data : val
            setTenant?.({ id })
          }}
          className="tenant-selector-select"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: selectedTenantId ? '2px solid var(--theme-success-500)' : '1px solid var(--theme-elevation-200)',
            backgroundColor: selectedTenantId ? 'var(--theme-success-100)' : 'var(--theme-elevation-0)',
            cursor: 'pointer',
            minWidth: '180px',
          }}
        >
          <option value="">Select tenant...</option>
          {tenantOptions.map((t) => (
            <option key={t.value} value={String(t.value)}>{t.label}</option>
          ))}
        </select>
      </div>

      <span style={{ color: 'var(--theme-elevation-500)', fontSize: '0.875rem' }}>
        {description}
      </span>
    </div>
  )
}

export default TenantSelector
