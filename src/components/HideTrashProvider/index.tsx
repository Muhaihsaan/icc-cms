'use client'

import { useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { z } from 'zod'

const Roles = { superAdmin: 'super-admin' } as const

const userRolesSchema = z.object({ roles: z.string().nullable().optional() })

function isSuperAdmin(user: unknown): boolean {
  const parsed = userRolesSchema.safeParse(user)
  if (!parsed.success) return false
  return parsed.data.roles === Roles.superAdmin
}

export function HideTrashProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user } = useAuth()
  const pathname = usePathname()

  // Hide trash-related UI for non-super-admin
  useEffect(() => {
    if (isSuperAdmin(user)) {
      const existingStyle = document.getElementById('hide-trash-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-trash-style'
    style.textContent = `
      /* Hide Trash tab */
      #trash-view-pill {
        display: none !important;
      }
      /* Hide "Skip trash and delete permanently" checkbox in delete modal */
      .delete-documents__checkbox {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-trash-style')
      if (existingStyle) existingStyle.remove()
    }
  }, [user])

  // Hide selection checkboxes only on users collection for non-super-admin
  useEffect(() => {
    const isUsersCollection = pathname?.includes('/collections/users')

    if (isSuperAdmin(user) || !isUsersCollection) {
      const existingStyle = document.getElementById('hide-users-select-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-users-select-style'
    style.textContent = `
      /* Hide selection checkboxes in users collection list */
      #heading-_select,
      .cell-_select,
      .row-_select {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-users-select-style')
      if (existingStyle) existingStyle.remove()
    }
  }, [user, pathname])

  return <>{children}</>
}
