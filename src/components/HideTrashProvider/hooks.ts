'use client'

import { useEffect } from 'react'
import type { ClientUser } from 'payload'
import { isSuperAdmin } from '@/access/client-checks'

/**
 * Hides trash-related UI elements for non-super-admin users.
 *
 * This hook injects CSS to hide:
 * - The "Trash" tab/pill in collection views (#trash-view-pill)
 * - The "Skip trash and delete permanently" checkbox in delete modals (.delete-documents__checkbox)
 *
 * Super-admins retain full access to trash functionality.
 * The injected styles are automatically cleaned up when the component unmounts
 * or when the user becomes a super-admin.
 */
export function useHideTrash(user: ClientUser | null | undefined): void {
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
}

/**
 * Hides row selection checkboxes on users and tenants collections for non-super-admin users.
 *
 * This hook injects CSS to hide:
 * - The select column header (#heading-_select)
 * - Individual row selection cells (.cell-_select, .row-_select)
 *
 * This prevents non-super-admins from bulk-selecting and performing
 * bulk operations (like bulk delete) on users and tenants.
 *
 * Super-admins retain full bulk selection capabilities.
 * The styles are only applied when viewing /collections/users or /collections/tenants.
 */
export function useHideSelection(user: ClientUser | null | undefined, pathname: string | null): void {
  useEffect(() => {
    const isUsersCollection = pathname?.includes('/collections/users')
    const isTenantsCollection = pathname?.includes('/collections/tenants')
    const shouldHide = isUsersCollection || isTenantsCollection

    if (isSuperAdmin(user) || !shouldHide) {
      const existingStyle = document.getElementById('hide-select-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-select-style'
    style.textContent = `
      /* Hide selection checkboxes in users/tenants collection list */
      #heading-_select,
      .cell-_select,
      .row-_select {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-select-style')
      if (existingStyle) existingStyle.remove()
    }
  }, [user, pathname])
}

/**
 * Hides the sidebar tenant selector when viewing collection pages.
 *
 * This hook injects CSS to hide the tenant selector (.tenant-selector)
 * when the user is on any collection page (/admin/collections/*).
 *
 * This is useful because tenant filtering is typically handled differently
 * within collection views (e.g., via query params or field-level filtering)
 * rather than the global sidebar selector.
 *
 * The styles are automatically removed when navigating away from collection pages.
 */
export function useHideTenantSelector(pathname: string | null): void {
  useEffect(() => {
    const isOnCollectionPage = pathname?.includes('/admin/collections/')

    if (!isOnCollectionPage) {
      const existingStyle = document.getElementById('hide-tenant-selector-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-tenant-selector-style'
    style.textContent = `
      /* Hide sidebar tenant selector on collection pages */
      .tenant-selector {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-tenant-selector-style')
      if (existingStyle) existingStyle.remove()
    }
  }, [pathname])
}
