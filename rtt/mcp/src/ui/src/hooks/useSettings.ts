import { useState, useEffect } from 'react'
import type { UserPreferences } from '@/types'

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  refresh_interval_ms: 2000,
  default_tenant: 'public',
  notifications_enabled: true,
}

export function useSettings() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = localStorage.getItem('user_preferences')
    return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES
  })

  useEffect(() => {
    localStorage.setItem('user_preferences', JSON.stringify(preferences))
  }, [preferences])

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }))
  }

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES)
  }

  return {
    preferences,
    updatePreferences,
    resetPreferences,
  }
}
