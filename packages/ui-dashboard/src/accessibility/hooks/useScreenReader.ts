import { useCallback } from 'react';

import { useAccessibility } from './useAccessibility';

/**
 * Hook for screen reader announcements
 * Meets WCAG 4.1.3 Status Messages requirements
 */
export function useScreenReader() {
  const { announce, settings } = useAccessibility();

  /**
   * Announce a message to screen readers
   * @param message - The message to announce
   * @param priority - 'polite' (default) or 'assertive'
   */
  const announceMessage = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announce(message, priority);
    },
    [announce]
  );

  /**
   * Announce a status change (uses polite)
   */
  const announceStatus = useCallback(
    (status: string) => {
      announce(status, 'polite');
    },
    [announce]
  );

  /**
   * Announce an error (uses assertive)
   */
  const announceError = useCallback(
    (error: string) => {
      announce(error, 'assertive');
    },
    [announce]
  );

  /**
   * Announce a success message
   */
  const announceSuccess = useCallback(
    (message: string) => {
      announce(message, 'polite');
    },
    [announce]
  );

  /**
   * Announce navigation change
   */
  const announceNavigation = useCallback(
    (location: string) => {
      announce(`Navigated to ${location}`, 'polite');
    },
    [announce]
  );

  /**
   * Announce loading state
   */
  const announceLoading = useCallback(
    (message: string = 'Loading') => {
      announce(`${message}. Please wait.`, 'polite');
    },
    [announce]
  );

  /**
   * Announce completion
   */
  const announceComplete = useCallback(
    (message: string = 'Complete') => {
      announce(message, 'polite');
    },
    [announce]
  );

  return {
    announce: announceMessage,
    announceStatus,
    announceError,
    announceSuccess,
    announceNavigation,
    announceLoading,
    announceComplete,
    isScreenReaderMode: settings.screenReaderMode,
  };
}
