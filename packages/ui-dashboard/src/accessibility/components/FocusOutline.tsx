import { useEffect } from 'react';

import { useAccessibility } from '../hooks/useAccessibility';

/**
 * Component that ensures visible focus indicators
 * Meets WCAG 2.4.7 Focus Visible requirement
 */
export function FocusOutline() {
  const { settings } = useAccessibility();

  useEffect(() => {
    // Add global styles for focus indicators
    const style = document.createElement('style');
    style.id = 'a11y-focus-styles';

    const focusStyles = `
      /* Base focus styles */
      :focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Enhanced focus for keyboard users */
      .keyboard-only :focus {
        outline: 3px solid #3b82f6;
        outline-offset: 3px;
      }

      /* High contrast mode */
      .high-contrast :focus {
        outline: 4px solid #fbbf24;
        outline-offset: 4px;
      }

      /* Focus-visible polyfill */
      .focus-visible :focus:not(:focus-visible) {
        outline: none;
      }

      .focus-visible :focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Interactive elements */
      button:focus,
      a:focus,
      input:focus,
      textarea:focus,
      select:focus,
      [role="button"]:focus,
      [role="link"]:focus,
      [tabindex]:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      }

      /* Custom focus for specific components */
      .metric-card:focus-within {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Focus within for complex widgets */
      .toolbar:focus-within,
      .menu:focus-within,
      .dialog:focus-within {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      /* Skip link focus */
      .skip-link:focus {
        outline: 3px solid #fbbf24;
        outline-offset: 2px;
      }

      /* Disabled state */
      :disabled:focus {
        outline: 2px dashed #6b7280;
        outline-offset: 2px;
      }

      /* Error state */
      [aria-invalid="true"]:focus {
        outline: 2px solid #ef4444;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
      }

      /* Success state */
      [aria-invalid="false"]:focus {
        outline: 2px solid #10b981;
        outline-offset: 2px;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
      }

      /* Focus trap container */
      [data-focus-trap]:focus {
        outline: none;
      }

      /* Remove default focus for mouse users */
      :focus:not(:focus-visible) {
        outline: none;
      }

      /* Ensure focus visible class works */
      .focus-visible :focus-visible {
        outline: 2px solid #3b82f6 !important;
        outline-offset: 2px !important;
      }
    `;

    style.textContent = focusStyles;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('a11y-focus-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [settings.focusVisible, settings.highContrast, settings.keyboardOnlyMode]);

  return null;
}
