'use client'
import { createContext, useContext, useLayoutEffect, useState } from 'react'

interface ThemeContextValue {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false)

  useLayoutEffect(() => {
    const saved = localStorage.getItem('theme')
    const dark = saved === 'dark' || (!saved && document.body.classList.contains('dark'))
    if (dark) {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    }
    setIsDark(dark)
  }, [])

  const toggle = () => {
    const goingDark = !isDark
    document.documentElement.classList.toggle('dark', goingDark)
    document.body.classList.toggle('dark', goingDark)
    localStorage.setItem('theme', goingDark ? 'dark' : 'light')
    setIsDark(goingDark)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
