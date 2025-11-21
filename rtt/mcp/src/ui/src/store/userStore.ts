import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Theme, UserPreferences } from '@/types'

interface UserState {
  theme: Theme
  preferences: UserPreferences
  setTheme: (theme: Theme) => void
  setPreferences: (preferences: Partial<UserPreferences>) => void
  toggleTheme: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      preferences: {
        theme: 'system',
        refresh_interval_ms: 2000,
        default_tenant: 'public',
        notifications_enabled: true,
      },
      setTheme: (theme) => {
        set({ theme })
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },
      setPreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),
      toggleTheme: () => {
        const current = get().theme
        const newTheme = current === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'user-storage',
    }
  )
)
