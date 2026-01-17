'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from '@payloadcms/ui'

import { isTopLevelUser } from '@/access/client-checks'

const TOP_LEVEL_KEY = 'icc-top-level'

// localStorage helpers
function getTopLevelStorage(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOP_LEVEL_KEY) === 'true'
}

function setTopLevelStorage(value: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOP_LEVEL_KEY, value.toString())
}

function hasStorageSet(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(TOP_LEVEL_KEY) !== null
}

type TopLevelModeContextType = {
  isTopLevelMode: boolean
  setTopLevelMode: (value: boolean) => void
}

const TopLevelModeContext = createContext<TopLevelModeContextType | null>(null)

export function TopLevelModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isTopLevel = isTopLevelUser(user)

  // Top-level users default to top-level mode (check localStorage for persistence)
  // Regular users are never in top-level mode
  const [isTopLevelMode, setIsTopLevelMode] = useState(() => {
    if (!isTopLevel) return false
    // Check if localStorage has a value - if not, default to true for top-level users
    if (!hasStorageSet()) {
      setTopLevelStorage(true)
      return true
    }
    return getTopLevelStorage()
  })

  const setTopLevelMode = useCallback(
    (value: boolean) => {
      // Only top-level users can enter top-level mode
      if (value && !isTopLevel) return
      setTopLevelStorage(value)
      setIsTopLevelMode(value)

      // Clear tenant cookie when entering top-level mode
      if (value && typeof document !== 'undefined') {
        document.cookie = 'payload-tenant=; path=/; max-age=0'
      }
    },
    [isTopLevel],
  )

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
