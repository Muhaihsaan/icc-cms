'use client'

import { useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import { useHideTrash, useHideSelection, useHideVersions, useHidePublish, useHideTenantSelector, useHideListControls } from './hooks'

/**
 * Provider component that manages admin UI visibility based on user roles and current page.
 *
 * This provider combines multiple UI customization hooks:
 * - useHideTrash: Hides trash UI for non-super-admins
 * - useHideSelection: Hides bulk selection on users/tenants collections for non-super-admins,
 *   and on posts for guest writers
 * - useHideVersions: Hides versions tab for guest writers
 * - useHidePublish: Hides publish button and status controls for guest writers
 * - useHideTenantSelector: Hides tenant selector on collection pages
 * - useHideListControls: Hides Columns and Filters dropdowns for all users
 *
 * @note Named HideTrashProvider for backwards compatibility, but handles multiple UI concerns.
 * Consider renaming to AdminUIProvider in future refactors.
 */
export function HideTrashProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const { user } = useAuth()
  const pathname = usePathname()

  useHideTrash(user)
  useHideSelection(user, pathname)
  useHideVersions(user)
  useHidePublish(user)
  useHideTenantSelector(pathname)
  useHideListControls()

  return <>{children}</>
}
