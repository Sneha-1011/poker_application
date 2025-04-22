"use client"

import type * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  enableSystem?: boolean
  attribute?: string
  disableTransitionOnChange?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
  enableSystem = true,
  attribute = "data-theme",
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement

    // Remove the initial class to prevent hydration mismatch
    root.classList.remove("light", "dark")

    if (disableTransitionOnChange) {
      root.classList.add("no-transitions")
    }

    // Apply the theme
    if (theme === "system" && enableSystem) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      root.classList.add(systemTheme)
      root.style.colorScheme = systemTheme
      root.setAttribute(attribute, systemTheme)
    } else {
      root.classList.add(theme)
      root.style.colorScheme = theme
      root.setAttribute(attribute, theme)
    }

    if (disableTransitionOnChange) {
      // Force a reflow
      document.body.offsetHeight
      root.classList.remove("no-transitions")
    }
  }, [theme, enableSystem, attribute, disableTransitionOnChange])

  useEffect(() => {
    if (storageKey) {
      try {
        const savedTheme = localStorage.getItem(storageKey) as Theme | null
        if (savedTheme) {
          setTheme(savedTheme)
        }
      } catch (e) {
        console.error("Error reading theme from localStorage:", e)
      }
    }
    setMounted(true)
  }, [storageKey])

  useEffect(() => {
    if (storageKey && mounted) {
      try {
        localStorage.setItem(storageKey, theme)
      } catch (e) {
        console.error("Error saving theme to localStorage:", e)
      }
    }
  }, [theme, storageKey, mounted])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme)
    },
  }

  // Only render children after mounted to avoid hydration mismatch
  return (
    <ThemeProviderContext.Provider value={value} {...props}>
      {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
