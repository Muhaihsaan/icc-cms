'use client'

import { useAuth } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useEffect, useLayoutEffect } from 'react'
import { z } from 'zod'

import { isTopLevelUser } from '@/access/client-checks'
import { useTopLevelMode } from './TopLevelModeContext'

// Collections to hide in top-level mode (only show Users and Tenants)
const HIDDEN_IN_TOP_LEVEL = ['pages', 'posts', 'media', 'categories', 'header', 'footer']

const optionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
})
const optionsArraySchema = z.array(optionSchema)

export function TenantSelector(): React.ReactElement | null {
  const { user } = useAuth()
  const tenantSelection = useTenantSelection()
  const { isTopLevelMode, setTopLevelMode } = useTopLevelMode()

  const isTopLevel = isTopLevelUser(user)

  // Parse options from plugin
  const optionsParsed = optionsArraySchema.safeParse(tenantSelection?.options)
  const tenantOptions = optionsParsed.success ? optionsParsed.data : []

  const selectedTenantIdSchema = z.union([z.string(), z.number()]).optional()
  const selectedTenantIdParsed = selectedTenantIdSchema.safeParse(tenantSelection?.selectedTenantID)
  const pluginTenantId = selectedTenantIdParsed.success ? selectedTenantIdParsed.data : undefined

  const setTenant = tenantSelection?.setTenant

  // The effective tenant ID: undefined if in top-level mode, otherwise plugin's value
  const selectedTenantId = isTopLevelMode ? undefined : pluginTenantId

  // Top Level = explicitly in top-level mode
  const isTopLevelSelected = isTopLevelMode

  const handleTopLevelSelect = () => {
    setTopLevelMode(true)
  }

  const handleTenantSelect = (id: string | number) => {
    setTopLevelMode(false)
    setTenant?.({ id })
  }

  // Hide sidebar tenant selector for top-level users (they use the dashboard selector)
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

  // Hide tenant-scoped collections in top-level mode (dashboard cards + nav links)
  // Check localStorage directly on initial render to prevent flash
  useLayoutEffect(() => {
    const styleId = 'hide-top-level-collections'
    const existing = document.getElementById(styleId)
    if (existing) existing.remove()

    // Check localStorage directly to catch initial page load before state is ready
    const isTopLevelFromStorage = localStorage.getItem('icc-top-level') === 'true'
    const shouldHide = isTopLevelFromStorage || (isTopLevel && isTopLevelSelected)

    if (!shouldHide) return

    // Generate CSS to hide dashboard cards and nav links for tenant-scoped collections
    const cardSelectors = HIDDEN_IN_TOP_LEVEL.map((c) => `#card-${c}`).join(', ')
    const navSelectors = HIDDEN_IN_TOP_LEVEL.map((c) => `nav a[href*="/collections/${c}"]`).join(
      ', ',
    )

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      /* Hide tenant-scoped collections */
      ${cardSelectors} { display: none !important; }
      ${navSelectors} { display: none !important; }
      /* Fix grid layout to reflow remaining cards */
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
    `
    document.head.appendChild(style)

    return () => {
      document.getElementById(styleId)?.remove()
    }
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
            backgroundColor: isTopLevelSelected
              ? 'var(--theme-success-500)'
              : 'var(--theme-elevation-200)',
            color: isTopLevelSelected ? 'white' : 'inherit',
            cursor: 'pointer',
            fontWeight: isTopLevelSelected ? 600 : 400,
            transition: 'all 0.15s ease',
          }}
        >
          Top Level
        </button>

        <select
          value={selectedTenantId ? `${selectedTenantId}` : ''}
          onChange={(e) => {
            const val = e.target.value
            if (!val) return

            // Parse as number if numeric, otherwise keep as string
            const numSchema = z.coerce.number()
            const numParsed = numSchema.safeParse(val)
            const id = numParsed.success ? numParsed.data : val
            handleTenantSelect(id)
          }}
          className="tenant-selector-select"
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            border: selectedTenantId
              ? '2px solid var(--theme-success-500)'
              : '1px solid var(--theme-elevation-200)',
            backgroundColor: selectedTenantId
              ? 'var(--theme-success-100)'
              : 'var(--theme-elevation-0)',
            cursor: 'pointer',
            minWidth: '180px',
          }}
        >
          <option value="">Select tenant...</option>
          {tenantOptions.map((t) => (
            <option key={t.value} value={`${t.value}`}>
              {t.label}
            </option>
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
