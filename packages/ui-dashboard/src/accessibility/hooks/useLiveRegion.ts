import { useRef, useEffect } from 'react';

interface LiveRegionOptions {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

/**
 * Hook to create and manage ARIA live regions
 * Meets WCAG 4.1.3 Status Messages requirements
 */
export function useLiveRegion(options: LiveRegionOptions = {}) {
  const { politeness = 'polite', atomic = true, relevant = 'additions text' } = options;

  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create live region if it doesn't exist
    if (!liveRegionRef.current) {
      const region = document.createElement('div');
      region.className = 'sr-only';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', atomic.toString());
      region.setAttribute('aria-relevant', relevant);
      document.body.appendChild(region);
      liveRegionRef.current = region;
    }

    return () => {
      // Clean up on unmount
      if (liveRegionRef.current) {
        document.body.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
    };
  }, [politeness, atomic, relevant]);

  const announce = (message: string) => {
    if (liveRegionRef.current) {
      // Clear and set new message to ensure it's announced
      liveRegionRef.current.textContent = '';
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = message;
        }
      }, 100);
    }
  };

  return { announce };
}

/**
 * Hook for timer-based announcements
 * Useful for progress indicators and countdowns
 */
export function useTimerAnnouncement(interval: number = 5000, options: LiveRegionOptions = {}) {
  const { announce } = useLiveRegion(options);
  const lastAnnouncementRef = useRef<number>(Date.now());

  const announceIfNeeded = (message: string, force: boolean = false) => {
    const now = Date.now();
    if (force || now - lastAnnouncementRef.current >= interval) {
      announce(message);
      lastAnnouncementRef.current = now;
    }
  };

  return { announce: announceIfNeeded };
}

/**
 * Hook for progress announcements
 * Announces progress at specific intervals
 */
export function useProgressAnnouncement(thresholds: number[] = [0, 25, 50, 75, 100]) {
  const { announce } = useLiveRegion({ politeness: 'polite' });
  const lastThresholdRef = useRef<number>(-1);

  const announceProgress = (progress: number, label?: string) => {
    // Find the highest threshold that's been reached
    const currentThreshold = thresholds.filter((t) => progress >= t).sort((a, b) => b - a)[0];

    // Only announce if we've crossed a new threshold
    if (currentThreshold !== undefined && currentThreshold !== lastThresholdRef.current) {
      const message = label
        ? `${label}: ${currentThreshold}% complete`
        : `${currentThreshold}% complete`;
      announce(message);
      lastThresholdRef.current = currentThreshold;
    }
  };

  const reset = () => {
    lastThresholdRef.current = -1;
  };

  return { announceProgress, reset };
}
