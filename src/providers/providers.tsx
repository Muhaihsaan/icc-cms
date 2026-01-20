import React from 'react'

import { HeaderThemeProvider } from './HeaderTheme/header-theme'
import { ThemeProvider } from './Theme/theme'

export const Providers: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <ThemeProvider>
      <HeaderThemeProvider>{children}</HeaderThemeProvider>
    </ThemeProvider>
  )
}
