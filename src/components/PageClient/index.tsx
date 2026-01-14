'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import React, { useEffect } from 'react'

type Props = {
  theme?: 'light' | 'dark'
}

export const PageClient: React.FC<Props> = ({ theme = 'light' }) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme(theme)
  }, [setHeaderTheme, theme])

  return <React.Fragment />
}

export default PageClient
