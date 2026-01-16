'use client'

import { useAuth, useField, useForm } from '@payloadcms/ui'
import type { FieldClientComponent } from 'payload'
import { useState } from 'react'
import { z } from 'zod'

import { Roles } from '@/access/accessPermission'

type UserWithRoles = {
  roles?: string | null
}

const rolesSchema = z.string()

const TOP_LEVEL_ROLES = [Roles.superAdmin, Roles.superEditor]

type RoleLevel = 'top' | 'tenant'

const RoleLevels = {
  top: 'top',
  tenant: 'tenant',
} as const

const isSuperAdminUser = (user: UserWithRoles | null): boolean => {
  if (!user) return false
  return user.roles === Roles.superAdmin
}

const RoleLevelSelector: FieldClientComponent = () => {
  const { user } = useAuth<UserWithRoles>()
  const { dispatchFields } = useForm()

  // Get roles value from this field (single string, not array)
  const { value: rolesValue, setValue: setRolesValue } = useField<string | null>({ path: 'roles' })

  // Determine initial level based on current data
  const hasTopRole = rolesSchema.safeParse(rolesValue).success && rolesValue !== null && rolesValue !== ''

  const [level, setLevel] = useState<RoleLevel>(() =>
    hasTopRole ? RoleLevels.top : RoleLevels.tenant,
  )

  const canAssignTopLevel = isSuperAdminUser(user ?? null)

  const handleLevelChange = (newLevel: RoleLevel) => {
    setLevel(newLevel)
    if (newLevel === RoleLevels.tenant) {
      // Clear top-level role when switching to tenant level
      setRolesValue(null)
    } else if (newLevel === RoleLevels.top) {
      // Set default top-level role and clear tenants
      setRolesValue(Roles.superEditor)
      dispatchFields({ type: 'UPDATE', path: 'tenants', value: [] })
    }
  }

  return (
    <div className="field-type" style={{ marginBottom: '1rem' }}>
      <label className="field-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
        Role Level
      </label>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {canAssignTopLevel && (
          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <input
              type="radio"
              name="roleLevel"
              checked={level === RoleLevels.top}
              onChange={() => handleLevelChange(RoleLevels.top)}
            />
            Top Level
          </label>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="radio"
            name="roleLevel"
            checked={level === RoleLevels.tenant}
            onChange={() => handleLevelChange(RoleLevels.tenant)}
          />
          Tenant Level
        </label>
      </div>

      {level === RoleLevels.top && canAssignTopLevel && (
        <div className="field-type">
          <label className="field-label">Top Level Role</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {TOP_LEVEL_ROLES.map((role) => {
              const isChecked = rolesValue === role
              return (
                <label
                  key={role}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                >
                  <input
                    type="radio"
                    name="topLevelRole"
                    checked={isChecked}
                    onChange={() => setRolesValue(role)}
                  />
                  {role === Roles.superAdmin ? 'Super Admin' : 'Super Editor'}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {level === RoleLevels.tenant && (
        <p style={{ color: 'var(--theme-elevation-500)', fontSize: '0.875rem' }}>
          Configure tenant and roles in the Tenants field below.
        </p>
      )}
    </div>
  )
}

export default RoleLevelSelector
