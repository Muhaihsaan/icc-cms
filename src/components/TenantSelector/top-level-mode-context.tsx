'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from '@payloadcms/ui'

import { validateTopLevelUser } from '@/access/client-checks'

const TOP_LEVEL_KEY = 'icc-top-level'

// localStorage helpers - only call these in useEffect/event handlers, never during render
function getTopLevelStorage(): boolean {
  return localStorage.getItem(TOP_LEVEL_KEY) === 'true'
}

function setTopLevelStorage(value: boolean): void {
  localStorage.setItem(TOP_LEVEL_KEY, value.toString())
}

function hasStorageSet(): boolean {
  return localStorage.getItem(TOP_LEVEL_KEY) !== null
}

type TopLevelModeContextType = {
  isTopLevelMode: boolean
  setTopLevelMode: (value: boolean) => void
  isHydrated: boolean
}

const TopLevelModeContext = createContext<TopLevelModeContextType | null>(null)

export function TopLevelModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isTopLevel = validateTopLevelUser(user)

  // Initialize with server-safe default (false), sync with localStorage after mount
  const [isTopLevelMode, setIsTopLevelMode] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Sync state with localStorage after hydration
  useEffect(() => {
    if (!isTopLevel) {
      setIsTopLevelMode(false)
    } else if (!hasStorageSet()) {
      // First time: default to true for top-level users
      setTopLevelStorage(true)
      setIsTopLevelMode(true)
    } else {
      setIsTopLevelMode(getTopLevelStorage())
    }
    setIsHydrated(true)
  }, [isTopLevel])

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
    <TopLevelModeContext.Provider value={{ isTopLevelMode, setTopLevelMode, isHydrated }}>
      {children}
    </TopLevelModeContext.Provider>
  )
}

export function useTopLevelMode() {
  const context = useContext(TopLevelModeContext)
  if (!context) {
    // If used outside provider, return safe defaults
    return { isTopLevelMode: false, setTopLevelMode: () => {}, isHydrated: false }
  }
  return context
}
