import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return

  const root = document.documentElement

  if (theme === 'system') {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', systemDark ? 'dark' : 'light')
    root.classList.toggle('dark', systemDark)
  } else {
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', theme === 'dark')
  }
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      toggleTheme: () => {
        const current = get().theme
        const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light'
        set({ theme: next })
        applyTheme(next)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme)
        }
      },
    },
  ),
)
