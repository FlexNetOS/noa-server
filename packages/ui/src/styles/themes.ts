/**
 * Theme Management System
 * Handles dark mode switching, theme persistence, and system preference detection
 */

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  resolvedTheme: 'light' | 'dark';
}

const STORAGE_KEY = 'noa-ui-theme';

/**
 * Get system theme preference
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Get stored theme preference
 */
export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored as Theme | null;
  } catch {
    return null;
  }
}

/**
 * Store theme preference
 */
export function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Resolve theme to actual 'light' or 'dark' value
 */
export function resolveTheme(theme: Theme, systemTheme: 'light' | 'dark'): 'light' | 'dark' {
  return theme === 'system' ? systemTheme : theme;
}

/**
 * Apply theme to document
 */
export function applyTheme(resolvedTheme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;

  // Remove existing theme classes
  root.classList.remove('light', 'dark');

  // Add new theme class
  root.classList.add(resolvedTheme);

  // Set color-scheme for native browser elements
  root.style.colorScheme = resolvedTheme;
}

/**
 * Initialize theme system
 */
export function initializeTheme(): ThemeConfig {
  const systemTheme = getSystemTheme();
  const storedTheme = getStoredTheme() || 'system';
  const resolvedTheme = resolveTheme(storedTheme, systemTheme);

  applyTheme(resolvedTheme);

  return {
    theme: storedTheme,
    systemTheme,
    resolvedTheme,
  };
}

/**
 * Set theme and persist
 */
export function setTheme(theme: Theme): ThemeConfig {
  const systemTheme = getSystemTheme();
  const resolvedTheme = resolveTheme(theme, systemTheme);

  storeTheme(theme);
  applyTheme(resolvedTheme);

  return {
    theme,
    systemTheme,
    resolvedTheme,
  };
}

/**
 * Watch for system theme changes
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  // Modern browsers
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  // Legacy browsers
  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}

/**
 * Theme manager class for React/framework integration
 */
export class ThemeManager {
  private config: ThemeConfig;
  private listeners: Set<(config: ThemeConfig) => void> = new Set();
  private systemThemeWatcher?: () => void;

  constructor() {
    this.config = initializeTheme();
    this.watchSystemChanges();
  }

  /**
   * Get current theme configuration
   */
  getConfig(): ThemeConfig {
    return { ...this.config };
  }

  /**
   * Set theme
   */
  setTheme(theme: Theme): void {
    this.config = setTheme(theme);
    this.notifyListeners();
  }

  /**
   * Toggle between light and dark
   */
  toggleTheme(): void {
    const newTheme = this.config.resolvedTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(listener: (config: ThemeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.config));
  }

  /**
   * Watch for system theme changes
   */
  private watchSystemChanges(): void {
    this.systemThemeWatcher = watchSystemTheme((systemTheme) => {
      this.config.systemTheme = systemTheme;

      // Update resolved theme if using system preference
      if (this.config.theme === 'system') {
        this.config.resolvedTheme = systemTheme;
        applyTheme(systemTheme);
        this.notifyListeners();
      }
    });
  }

  /**
   * Cleanup watchers
   */
  destroy(): void {
    if (this.systemThemeWatcher) {
      this.systemThemeWatcher();
    }
    this.listeners.clear();
  }
}

/**
 * Singleton theme manager instance
 */
let themeManagerInstance: ThemeManager | null = null;

export function getThemeManager(): ThemeManager {
  if (!themeManagerInstance) {
    themeManagerInstance = new ThemeManager();
  }
  return themeManagerInstance;
}

/**
 * Theme preset configurations
 */
export const themePresets = {
  light: {
    primary: 'rgb(14 165 233)',
    secondary: 'rgb(168 85 247)',
    background: 'rgb(255 255 255)',
    foreground: 'rgb(23 23 23)',
  },
  dark: {
    primary: 'rgb(56 189 248)',
    secondary: 'rgb(192 132 252)',
    background: 'rgb(10 10 10)',
    foreground: 'rgb(250 250 250)',
  },
} as const;

/**
 * Get current theme CSS variables
 */
export function getThemeVariables(theme: 'light' | 'dark'): Record<string, string> {
  return themePresets[theme];
}
