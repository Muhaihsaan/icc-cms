'use client'

import { useAuth, useField, useForm } from '@payloadcms/ui'
import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import type { FieldClientComponent } from 'payload'
import { useEffect } from 'react'
import { z } from 'zod'

import { Roles } from '@/access'
import { isSuperAdmin } from '@/access/client-checks'
import { useTopLevelMode } from '@/components/TenantSelector/TopLevelModeContext'

const TOP_LEVEL_ROLES = [
  { value: Roles.superAdmin, label: 'Super Admin' },
  { value: Roles.superEditor, label: 'Super Editor' },
]

const TENANT_ROLES = [
  { value: Roles.tenantAdmin, label: 'Tenant Admin' },
  { value: Roles.tenantUser, label: 'Tenant User' },
  { value: Roles.guestWriter, label: 'Guest Writer' },
]

const selectedTenantIdSchema = z.union([z.string(), z.number()])

const UserRoleField: FieldClientComponent = () => {
  const { user } = useAuth()
  const tenantSelection = useTenantSelection()
  const { dispatchFields } = useForm()
  const { isTopLevelMode } = useTopLevelMode()

  const selectedTenantIdParsed = selectedTenantIdSchema.safeParse(tenantSelection?.selectedTenantID)
  const pluginTenantId = selectedTenantIdParsed.success ? selectedTenantIdParsed.data : undefined

  // Effective tenant ID: undefined if in top-level mode
  const selectedTenantId = isTopLevelMode ? undefined : pluginTenantId

  // Only super-admin can create top-level users
  const canCreateTopLevelUsers = isSuperAdmin(user)
  // Top-level mode from context
  const isTopLevel = isTopLevelMode && canCreateTopLevelUsers

  // Top-level role field
  const { value: topLevelRole, setValue: setTopLevelRole } = useField<string | null>({ path: 'roles' })

  // Tenant role field (first tenant's roles)
  const { value: tenantRoles, setValue: setTenantRoles } = useField<string[] | null>({
    path: 'tenants.0.roles',
  })

  const currentTenantRole = Array.isArray(tenantRoles) ? tenantRoles[0] : undefined

  // Hide/show/disable tenant field based on context
  useEffect(() => {
    const styleId = 'user-role-field-styles'
    const existingStyle = document.getElementById(styleId)
    if (existingStyle) existingStyle.remove()

    const style = document.createElement('style')
    style.id = styleId

    if (isTopLevel) {
      // Hide the Assigned Tenant field and Tenants array when in top level
      style.textContent = `
        /* Hide plugin's tenant field */
        .tenantField,
        [data-field-path="tenant"],
        .field-type.relationship[data-field-path="tenant"] {
          display: none !important;
        }
        /* Hide our tenants array */
        .field-type.array[data-field-path="tenants"] {
          display: none !important;
        }
      `
    } else {
      // Hide plugin's tenant field (we show our own display instead)
      style.textContent = `
        /* Hide our tenants array completely */
        .field-type.array[data-field-path="tenants"] {
          display: none !important;
        }
        /* Hide plugin's tenant field (we show our own Assigned Tenant display) */
        .tenantField,
        [data-field-path="tenant"],
        .field-type.relationship[data-field-path="tenant"] {
          display: none !important;
        }
      `
    }

    document.head.appendChild(style)

    return () => {
      const el = document.getElementById(styleId)
      if (el) el.remove()
    }
  }, [isTopLevel])

  // Sync tenant data when tenant is selected
  useEffect(() => {
    if (!selectedTenantId) return

    // Set the tenant in the tenants array
    dispatchFields({
      type: 'UPDATE',
      path: 'tenants',
      value: [{ tenant: selectedTenantId, roles: tenantRoles || [Roles.tenantUser] }],
    })
  }, [selectedTenantId, dispatchFields, tenantRoles])

  // Clear top-level role when in tenant context
  useEffect(() => {
    if (!isTopLevel && topLevelRole) {
      setTopLevelRole(null)
    }
  }, [isTopLevel, topLevelRole, setTopLevelRole])

  // Clear tenant data when in top-level context
  useEffect(() => {
    if (isTopLevel) {
      dispatchFields({ type: 'UPDATE', path: 'tenants', value: [] })
    }
  }, [isTopLevel, dispatchFields])

  const handleRoleChange = (role: string) => {
    if (isTopLevel) {
      setTopLevelRole(role)
    } else {
      setTenantRoles([role])
    }
  }

  const roles = isTopLevel ? TOP_LEVEL_ROLES : TENANT_ROLES
  const currentRole = isTopLevel ? topLevelRole : currentTenantRole

  // Get tenant name from options
  const tenantOptionsSchema = z.array(z.object({ label: z.string(), value: z.union([z.string(), z.number()]) }))
  const optionsParsed = tenantOptionsSchema.safeParse(tenantSelection?.options)
  const tenantOptions = optionsParsed.success ? optionsParsed.data : []
  const selectedTenantName = tenantOptions.find((t) => t.value === selectedTenantId)?.label

  // Super-editor without tenant selected - show warning
  const showNoAccessWarning = !canCreateTopLevelUsers && !selectedTenantId

  if (showNoAccessWarning) {
    return (
      <div className="field-type" style={{ marginBottom: '1rem' }}>
        <label className="field-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Role
          <span style={{ color: 'var(--theme-error-500)', marginLeft: '0.25rem' }}>*</span>
        </label>
        <p style={{ color: 'var(--theme-error-500)', fontSize: '0.875rem' }}>
          You do not have access to create top-level accounts. Please select a tenant first.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Show assigned tenant when in tenant mode */}
      {!isTopLevel && selectedTenantId && (
        <div className="field-type" style={{ marginBottom: '1rem' }}>
          <label className="field-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
            Assigned Tenant
          </label>
          <div
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '4px',
              border: '1px solid var(--theme-elevation-150)',
              backgroundColor: 'var(--theme-elevation-100)',
              fontSize: '1rem',
              color: 'var(--theme-elevation-800)',
              cursor: 'not-allowed',
            }}
          >
            {selectedTenantName || `Tenant ${selectedTenantId}`}
          </div>
          <p style={{ color: 'var(--theme-elevation-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            This user will be assigned to this tenant.
          </p>
        </div>
      )}

      <div className="field-type" style={{ marginBottom: '1rem' }}>
        <label className="field-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
          Role {isTopLevel ? '(Top Level)' : '(Tenant)'}
          <span style={{ color: 'var(--theme-error-500)', marginLeft: '0.25rem' }}>*</span>
        </label>

        <select
          value={currentRole || ''}
          onChange={(e) => handleRoleChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '4px',
            border: '1px solid var(--theme-elevation-150)',
            backgroundColor: 'var(--theme-elevation-0)',
            fontSize: '1rem',
          }}
        >
          <option value="">Select role...</option>
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>

        <p style={{ color: 'var(--theme-elevation-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {isTopLevel
            ? 'Top-level users have access to all tenants.'
            : 'Tenant users have access only to the assigned tenant.'}
        </p>
      </div>
    </>
  )
}

export default UserRoleField
