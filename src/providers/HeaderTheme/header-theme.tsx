'use client'

import type { Theme } from '@/providers/Theme/types'

import React, { createContext, useCallback, use, useState } from 'react'
import { z } from 'zod'

import canUseDOM from '@/utilities/can-use-dom'

const themeSchema = z.enum(['dark', 'light'])

const getInitialTheme = (): Theme | undefined => {
  if (!canUseDOM) return undefined
  const attr = document.documentElement.getAttribute('data-theme')
  const parsed = themeSchema.safeParse(attr)
  return parsed.success ? parsed.data : undefined
}

export interface ContextType {
  headerTheme?: Theme | null
  setHeaderTheme: (theme: Theme | null) => void
}

const initialContext: ContextType = {
  headerTheme: undefined,
  setHeaderTheme: () => null,
}

const HeaderThemeContext = createContext(initialContext)

export const HeaderThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [headerTheme, setThemeState] = useState<Theme | undefined | null>(getInitialTheme)

  const setHeaderTheme = useCallback((themeToSet: Theme | null) => {
    setThemeState(themeToSet)
  }, [])

  return <HeaderThemeContext value={{ headerTheme, setHeaderTheme }}>{children}</HeaderThemeContext>
}

export const useHeaderTheme = (): ContextType => use(HeaderThemeContext)
