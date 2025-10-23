/**
 * Accessibility Module Exports
 * Central export point for all accessibility features
 */

// Provider and Context
export { AccessibilityProvider, useAccessibility } from './AccessibilityProvider';

// Hooks
export {
  useAccessibility as useA11y,
  useReducedMotion,
  useHighContrast,
  useFontSize,
  useKeyboardOnly,
  useScreenReader as useScreenReaderDetection,
} from './hooks/useAccessibility';

export { useFocusTrap } from './hooks/useFocusTrap';
export { useKeyboardNav, useRovingTabIndex } from './hooks/useKeyboardNav';
export { useScreenReader } from './hooks/useScreenReader';
export {
  useLiveRegion,
  useTimerAnnouncement,
  useProgressAnnouncement,
} from './hooks/useLiveRegion';

// Components
export { SkipLinks } from './components/SkipLinks';
export { FocusOutline } from './components/FocusOutline';
export { HighContrast } from './components/HighContrast';
export { FontSizeControls } from './components/FontSizeControls';
export { ReducedMotion } from './components/ReducedMotion';
export { AriaAnnouncer, announce } from './components/AriaAnnouncer';
export { A11yControls } from './components/A11yControls';

// Utilities
export {
  componentAuditResults,
  getIssuesBySeverity,
  getIssuesByCriterion,
  getIssuesByComponent,
  generateAuditReport,
  componentFixTemplates,
  type A11yIssue,
} from './utils/componentAudits';

// Theme
export { default as a11yTheme, generateCSSVariables, a11yUtilities } from '../theme/accessibility';

// Types
export type { AccessibilitySettings } from './AccessibilityProvider';
