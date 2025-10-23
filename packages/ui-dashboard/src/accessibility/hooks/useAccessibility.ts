import { useContext } from 'react';

import { AccessibilityContext } from '../AccessibilityProvider';

/**
 * Hook to access accessibility settings and functions
 * Must be used within AccessibilityProvider
 */
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

/**
 * Hook to check if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const { settings } = useAccessibility();
  return settings.reducedMotion;
}

/**
 * Hook to check if high contrast mode is enabled
 */
export function useHighContrast(): boolean {
  const { settings } = useAccessibility();
  return settings.highContrast;
}

/**
 * Hook to get current font size multiplier
 */
export function useFontSize(): number {
  const { settings } = useAccessibility();
  return settings.fontSize;
}

/**
 * Hook to check if keyboard-only mode is active
 */
export function useKeyboardOnly(): boolean {
  const { settings } = useAccessibility();
  return settings.keyboardOnlyMode;
}

/**
 * Hook to check if screen reader mode is enabled
 */
export function useScreenReader(): boolean {
  const { settings } = useAccessibility();
  return settings.screenReaderMode;
}
