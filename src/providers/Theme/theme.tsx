'use client'

import React, { createContext, useCallback, use, useEffect, useState } from 'react'

import type { Theme, ThemeContextType } from './types'
import { themeSchema } from './types'

import canUseDOM from '@/utilities/can-use-dom'
import { defaultTheme, getImplicitPreference, themeLocalStorageKey } from './shared'

const getInitialTheme = (): Theme | undefined => {
  if (!canUseDOM) return undefined
  const attr = document.documentElement.getAttribute('data-theme')
  const parsed = themeSchema.safeParse(attr)
  return parsed.success ? parsed.data : undefined
}

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
}

const ThemeContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme | undefined>(getInitialTheme)

  const setTheme = useCallback((themeToSet: Theme | null) => {
    if (themeToSet === null) {
      window.localStorage.removeItem(themeLocalStorageKey)
      const implicitPreference = getImplicitPreference()
      document.documentElement.setAttribute('data-theme', implicitPreference || '')
      if (implicitPreference) setThemeState(implicitPreference)
    } else {
      setThemeState(themeToSet)
      window.localStorage.setItem(themeLocalStorageKey, themeToSet)
      document.documentElement.setAttribute('data-theme', themeToSet)
    }
  }, [])

  useEffect(() => {
    let themeToSet: Theme = defaultTheme
    const preference = window.localStorage.getItem(themeLocalStorageKey)
    const parsed = themeSchema.safeParse(preference)

    if (parsed.success) {
      themeToSet = parsed.data
    } else {
      const implicitPreference = getImplicitPreference()

      if (implicitPreference) {
        themeToSet = implicitPreference
      }
    }

    document.documentElement.setAttribute('data-theme', themeToSet)
    setThemeState(themeToSet)
  }, [])

  return <ThemeContext value={{ setTheme, theme }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
