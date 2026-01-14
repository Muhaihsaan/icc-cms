'use client'

import { useAuth } from '@payloadcms/ui'
import { useEffect } from 'react'

const Roles = { superAdmin: 'super-admin' } as const

type UserWithRoles = { roles?: string[] | null }

function isSuperAdmin(user: UserWithRoles | null | undefined): boolean {
  return Boolean(user?.roles?.includes(Roles.superAdmin))
}

export function HideTrashProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user } = useAuth<UserWithRoles>()

  useEffect(() => {
    if (isSuperAdmin(user)) {
      // Remove style if user becomes super-admin
      const existingStyle = document.getElementById('hide-trash-tab')
      if (existingStyle) existingStyle.remove()
      return
    }

    // Hide Trash-related UI for non-super-admin
    const style = document.createElement('style')
    style.id = 'hide-trash-tab'
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
      const existingStyle = document.getElementById('hide-trash-tab')
      if (existingStyle) existingStyle.remove()
    }
  }, [user])

  return <>{children}</>
}
