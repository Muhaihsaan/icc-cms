import { z } from 'zod'

export const themeSchema = z.enum(['dark', 'light'])

export type Theme = z.infer<typeof themeSchema>

export interface ThemeContextType {
  setTheme: (theme: Theme | null) => void
  theme?: Theme | null
}
