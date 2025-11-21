/**
 * useChartTheme Hook
 * Manages chart theming with light/dark mode support
 */

import { useMemo } from 'react';
import type { ChartTheme, ThemeMode } from '../types/charts';

/**
 * Default light theme configuration
 */
const LIGHT_THEME: ChartTheme = {
  colors: [
    '#3b82f6', // blue-500
    '#22c55e', // green-500
    '#fbbf24', // amber-400
    '#ef4444', // red-500
    '#a855f7', // purple-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
    '#f97316', // orange-500
  ],
  backgroundColor: '#ffffff',
  textColor: '#1f2937', // gray-800
  gridColor: '#e5e7eb', // gray-200
  tooltipBg: '#ffffff',
  tooltipText: '#1f2937',
  borderColor: '#d1d5db', // gray-300
  gradientColors: [
    { start: '#3b82f680', end: '#3b82f610' },
    { start: '#22c55e80', end: '#22c55e10' },
    { start: '#fbbf2480', end: '#fbbf2410' },
    { start: '#ef444480', end: '#ef444410' },
  ],
};

/**
 * Default dark theme configuration
 */
const DARK_THEME: ChartTheme = {
  colors: [
    '#60a5fa', // blue-400
    '#4ade80', // green-400
    '#fbbf24', // amber-400
    '#f87171', // red-400
    '#c084fc', // purple-400
    '#f472b6', // pink-400
    '#2dd4bf', // teal-400
    '#fb923c', // orange-400
  ],
  backgroundColor: '#0f172a', // slate-900
  textColor: '#f1f5f9', // slate-100
  gridColor: '#334155', // slate-700
  tooltipBg: '#1e293b', // slate-800
  tooltipText: '#f1f5f9',
  borderColor: '#475569', // slate-600
  gradientColors: [
    { start: '#60a5fa80', end: '#60a5fa10' },
    { start: '#4ade8080', end: '#4ade8010' },
    { start: '#fbbf2480', end: '#fbbf2410' },
    { start: '#f8717180', end: '#f8717110' },
  ],
};

/**
 * Hook options
 */
interface UseChartThemeOptions {
  /** Theme mode (defaults to system preference or 'light') */
  mode?: ThemeMode;
  /** Custom theme overrides */
  customTheme?: Partial<ChartTheme>;
  /** Auto-detect system dark mode preference */
  autoDetect?: boolean;
}

/**
 * Returns merged chart theme based on mode and custom overrides
 */
export function useChartTheme(options: UseChartThemeOptions = {}): ChartTheme {
  const { mode, customTheme, autoDetect = true } = options;

  // Detect system dark mode preference
  const systemDarkMode = useMemo(() => {
    if (!autoDetect || typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [autoDetect]);

  // Determine effective theme mode
  const effectiveMode: ThemeMode = mode || (systemDarkMode ? 'dark' : 'light');

  // Merge base theme with custom overrides
  const theme = useMemo(() => {
    const baseTheme = effectiveMode === 'dark' ? DARK_THEME : LIGHT_THEME;

    if (!customTheme) {
      return baseTheme;
    }

    return {
      ...baseTheme,
      ...customTheme,
      colors: customTheme.colors || baseTheme.colors,
      gradientColors: customTheme.gradientColors || baseTheme.gradientColors,
    };
  }, [effectiveMode, customTheme]);

  return theme;
}

/**
 * Hook to get a specific color from the theme palette
 */
export function useChartColor(
  index: number,
  options: UseChartThemeOptions = {}
): string {
  const theme = useChartTheme(options);
  return theme.colors[index % theme.colors.length];
}

/**
 * Hook to get multiple colors from the theme palette
 */
export function useChartColors(
  count: number,
  options: UseChartThemeOptions = {}
): string[] {
  const theme = useChartTheme(options);
  return Array.from({ length: count }, (_, i) =>
    theme.colors[i % theme.colors.length]
  );
}

/**
 * Get gradient ID for area charts
 */
export function getGradientId(dataKey: string): string {
  return `gradient-${dataKey}`;
}

/**
 * Export theme presets for direct use
 */
export const CHART_THEMES = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
} as const;
