'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@payloadcms/ui'
import { z } from 'zod'

import { isTopLevelUser } from '@/access/client-checks'

const TOP_LEVEL_COOKIE = 'icc-top-level'

// Schema for browser document object
const documentSchema = z.object({
  cookie: z.string(),
})

// Cookie helpers - session cookies (no max-age) clear when browser closes
function getTopLevelCookie(): boolean {
  const docParsed = documentSchema.safeParse(globalThis.document)
  if (!docParsed.success) return false
  return docParsed.data.cookie.includes(`${TOP_LEVEL_COOKIE}=true`)
}

function setTopLevelCookie(value: boolean): void {
  const docParsed = documentSchema.safeParse(globalThis.document)
  if (!docParsed.success) return
  // Session cookie - no max-age means it expires when browser closes
  // Set to 'true' or 'false' (not clearing) so we can distinguish from "never set"
  globalThis.document.cookie = `${TOP_LEVEL_COOKIE}=${value}; path=/`
}

function hasCookieSet(): boolean {
  const docParsed = documentSchema.safeParse(globalThis.document)
  if (!docParsed.success) return false
  return docParsed.data.cookie.includes(TOP_LEVEL_COOKIE)
}

type TopLevelModeContextType = {
  isTopLevelMode: boolean
  setTopLevelMode: (value: boolean) => void
}

const TopLevelModeContext = createContext<TopLevelModeContextType | null>(null)

export function TopLevelModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isTopLevel = isTopLevelUser(user)

  // Top-level users default to top-level mode (check cookie for persistence within session)
  // Regular users are never in top-level mode
  const [isTopLevelMode, setIsTopLevelMode] = useState(() => {
    if (!isTopLevel) return false
    // Check if cookie exists - if not, default to true for top-level users
    if (!hasCookieSet()) {
      // Set cookie on first load for top-level users
      setTopLevelCookie(true)
      return true
    }
    return getTopLevelCookie()
  })

  const setTopLevelMode = useCallback((value: boolean) => {
    // Only top-level users can enter top-level mode
    if (value && !isTopLevel) return
    // Update cookie for middleware to read
    setTopLevelCookie(value)
    setIsTopLevelMode(value)
  }, [isTopLevel])

  return (
    <TopLevelModeContext.Provider value={{ isTopLevelMode, setTopLevelMode }}>
      {children}
    </TopLevelModeContext.Provider>
  )
}

export function useTopLevelMode() {
  const context = useContext(TopLevelModeContext)
  if (!context) {
    // If used outside provider, return safe defaults
    return { isTopLevelMode: false, setTopLevelMode: () => {} }
  }
  return context
}
