'use client'

import { useEffect } from 'react'
import type { ClientUser } from 'payload'
import { isSuperAdmin, hasGuestWriterRole } from '@/access/client-checks'

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
 * Hides row selection checkboxes based on user role and collection.
 *
 * This hook injects CSS to hide:
 * - The select column header (#heading-_select)
 * - Individual row selection cells (.cell-_select, .row-_select)
 *
 * Selection is hidden for:
 * - Non-super-admins on users and tenants collections
 * - Guest writers on posts collection (they cannot delete posts)
 *
 * Super-admins retain full bulk selection capabilities on all collections.
 */
export function useHideSelection(user: ClientUser | null | undefined, pathname: string | null): void {
  useEffect(() => {
    const isUsersCollection = pathname?.includes('/collections/users')
    const isTenantsCollection = pathname?.includes('/collections/tenants')
    const isPostsCollection = pathname?.includes('/collections/posts')

    // Non-super-admins can't bulk select on users/tenants
    const hideForNonSuperAdmin = !isSuperAdmin(user) && (isUsersCollection || isTenantsCollection)

    // Guest writers can't bulk select on posts (no delete access)
    const hideForGuestWriter = hasGuestWriterRole(user) && isPostsCollection

    const shouldHide = hideForNonSuperAdmin || hideForGuestWriter

    if (!shouldHide) {
      const existingStyle = document.getElementById('hide-select-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-select-style'
    style.textContent = `
      /* Hide selection checkboxes */
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
 * Hides the Versions tab for guest writers.
 *
 * Guest writers should not have access to version history as they can only
 * edit their own posts and don't need versioning capabilities.
 */
export function useHideVersions(user: ClientUser | null | undefined): void {
  useEffect(() => {
    if (!hasGuestWriterRole(user)) {
      const existingStyle = document.getElementById('hide-versions-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-versions-style'
    style.textContent = `
      /* Hide Versions tab for guest writers */
      [id^="doc-tab-Versions"],
      button[id*="versions" i],
      a[href*="/versions"] {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-versions-style')
      if (existingStyle) existingStyle.remove()
    }
  }, [user])
}

/**
 * Hides publish-related UI for guest writers.
 *
 * Guest writers cannot publish posts - they can only save drafts.
 * This hides:
 * - The publish button
 * - The status/publish controls in the sidebar
 * - The schedule publish option
 */
export function useHidePublish(user: ClientUser | null | undefined): void {
  useEffect(() => {
    if (!hasGuestWriterRole(user)) {
      const existingStyle = document.getElementById('hide-publish-style')
      if (existingStyle) existingStyle.remove()
      return
    }

    const style = document.createElement('style')
    style.id = 'hide-publish-style'
    style.textContent = `
      /* Hide publish button and status controls for guest writers */
      .doc-controls__publish,
      .publish,
      #action-publish,
      button[id*="publish" i],
      .doc-controls__status,
      .publish-button,
      [class*="publish" i]:not([class*="unpublish"]),
      /* Hide schedule publish */
      .schedule-publish,
      [class*="schedule-publish"],
      /* Hide the status pill that shows Published/Draft with action links */
      .doc-controls__content-status {
        display: none !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      const existingStyle = document.getElementById('hide-publish-style')
      if (existingStyle) existingStyle.remove()
    }
  }, [user])
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
