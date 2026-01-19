'use client'

import { useAuth } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { isTopLevelUser } from '@/access/client-checks'
import { useTopLevelMode } from './TopLevelModeContext'
import { tenantManagedCollections } from '@/config'
import {
  useIsMounted,
  injectStyle,
  observeDOM,
  markElementsByText,
  removeClassFromAll,
} from './utils/dom-utils'

const optionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
})
const optionsArraySchema = z.array(optionSchema)

const tenantResponseSchema = z.object({
  allowedCollections: z.array(z.string()).nullable().optional(),
})

// Define which collections belong to which group
const collectionGroups: Record<string, string[]> = {
  'Site Content': ['pages', 'categories', 'posts', 'media'],
  'Global Site Content': ['header', 'footer'],
}

const allGroups = Object.keys(collectionGroups)

export function TenantSelector(): React.ReactElement | null {
  const { user } = useAuth()
  const tenantSelection = useTenantSelection()
  const { isTopLevelMode, setTopLevelMode, isHydrated } = useTopLevelMode()
  const isMounted = useIsMounted()

  const isTopLevel = isTopLevelUser(user)
  const [allowedCollections, setAllowedCollections] = useState<string[] | null>(null)

  // Parse tenant options
  const optionsParsed = optionsArraySchema.safeParse(tenantSelection?.options)
  const tenantOptions = optionsParsed.success ? optionsParsed.data : []

  const selectedTenantIdParsed = z.union([z.string(), z.number()]).optional().safeParse(tenantSelection?.selectedTenantID)
  const pluginTenantId = selectedTenantIdParsed.success ? selectedTenantIdParsed.data : undefined
  const setTenant = tenantSelection?.setTenant

  const selectedTenantId = isTopLevelMode ? undefined : pluginTenantId
  const isTopLevelSelected = isTopLevelMode

  const handleTopLevelSelect = () => {
    setTopLevelMode(true)
    setAllowedCollections(null)
  }

  const handleTenantSelect = (id: string | number) => {
    setTopLevelMode(false)
    setTenant?.({ id })
  }

  // Fetch allowedCollections when a tenant is selected
  useEffect(() => {
    if (!isTopLevel || isTopLevelMode || !selectedTenantId) {
      setAllowedCollections(null)
      return
    }

    const fetchAllowed = async () => {
      try {
        const res = await fetch(`/api/tenants/${selectedTenantId}?depth=0`)
        if (!res.ok) {
          setAllowedCollections(null)
          return
        }
        const data: unknown = await res.json()
        const parsed = tenantResponseSchema.safeParse(data)
        setAllowedCollections(parsed.success && parsed.data.allowedCollections ? parsed.data.allowedCollections : null)
      } catch {
        setAllowedCollections(null)
      }
    }

    void fetchAllowed()
  }, [isTopLevel, isTopLevelMode, selectedTenantId])

  // Hide sidebar tenant selector for top-level users
  useEffect(() => {
    if (!isMounted || !isTopLevel) return
    return injectStyle('hide-sidebar-tenant', `.tenant-selector { display: none !important; }`)
  }, [isMounted, isTopLevel])

  // Hide collections based on mode
  useEffect(() => {
    if (!isMounted || !isHydrated) return

    const inTopLevelMode = isTopLevel && isTopLevelSelected

    let collectionsToHide: string[] = []
    if (inTopLevelMode) {
      collectionsToHide = [...tenantManagedCollections]
    } else if (isTopLevel && selectedTenantId && allowedCollections) {
      collectionsToHide = tenantManagedCollections.filter((c) => !allowedCollections.includes(c))
    }

    if (collectionsToHide.length === 0) return

    const cardSelectors = collectionsToHide.map((c) => `#card-${c}`).join(', ')
    const navSelectors = collectionsToHide.map((c) => `nav a[href*="/collections/${c}"]`).join(', ')

    return injectStyle('hide-top-level-collections', `
      ${cardSelectors} { display: none !important; }
      ${navSelectors} { display: none !important; }
    `)
  }, [isMounted, isHydrated, isTopLevel, isTopLevelSelected, selectedTenantId, allowedCollections])

  // Hide nav groups in sidebar and dashboard
  useEffect(() => {
    if (!isMounted || !isHydrated) return

    const inTopLevelMode = isTopLevel && isTopLevelSelected
    const hideClass = 'hide-dashboard-group'

    // Determine which groups to hide
    let groupsToHide: string[] = []
    if (inTopLevelMode) {
      groupsToHide = [...allGroups]
    } else if (isTopLevel && selectedTenantId && allowedCollections) {
      groupsToHide = allGroups.filter((group) => {
        const groupCollections = collectionGroups[group] || []
        return !groupCollections.some((c) => allowedCollections.includes(c))
      })
    }

    // Clear previous state
    removeClassFromAll(hideClass)

    if (groupsToHide.length === 0) {
      injectStyle('hide-tenant-groups-style', '')
      return
    }

    // CSS for sidebar nav groups and dashboard labels
    const navGroupSelectors = groupsToHide.map((g) => `[id="nav-group-${g}"]`).join(', ')
    injectStyle('hide-tenant-groups-style', `
      ${navGroupSelectors} { display: none !important; }
      .${hideClass} { display: none !important; }
    `)

    // Mark dashboard labels with observer
    return observeDOM(() => {
      markElementsByText('h2, h3, h4, p', groupsToHide, hideClass)
    })
  }, [isMounted, isHydrated, isTopLevel, isTopLevelSelected, selectedTenantId, allowedCollections])

  if (!isTopLevel) return null

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
          value={selectedTenantId ? `${selectedTenantId}` : ''}
          onChange={(e) => {
            const val = e.target.value
            if (!val) return
            const numParsed = z.coerce.number().safeParse(val)
            handleTenantSelect(numParsed.success ? numParsed.data : val)
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
