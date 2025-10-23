import { useEffect } from 'react';

import { useAccessibility } from '../hooks/useAccessibility';

interface ReducedMotionProps {
  children?: React.ReactNode;
}

/**
 * Reduced motion component
 * Meets WCAG 2.2.2 Pause, Stop, Hide and 2.3.3 Animation from Interactions
 */
export function ReducedMotion({ children }: ReducedMotionProps) {
  const { settings, updateSettings } = useAccessibility();

  const toggleReducedMotion = () => {
    updateSettings({ reducedMotion: !settings.reducedMotion });
  };

  useEffect(() => {
    // Add global styles for reduced motion
    const style = document.createElement('style');
    style.id = 'a11y-reduced-motion-styles';

    const motionStyles = `
      /* Reduced motion styles */
      .reduce-motion *,
      .reduce-motion *::before,
      .reduce-motion *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }

      /* Disable Framer Motion animations */
      .reduce-motion [data-framer-motion] {
        animation: none !important;
        transition: none !important;
      }

      /* Disable specific animations */
      .reduce-motion .fade-in,
      .reduce-motion .slide-in,
      .reduce-motion .scale-in,
      .reduce-motion .rotate-in {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }

      /* Allow essential motion */
      .reduce-motion .essential-motion {
        animation-duration: 0.2s !important;
        transition-duration: 0.2s !important;
      }

      /* Disable parallax effects */
      .reduce-motion [data-parallax] {
        transform: none !important;
      }

      /* Disable auto-scrolling */
      .reduce-motion [data-auto-scroll] {
        animation-play-state: paused !important;
      }

      /* Stop video autoplay */
      .reduce-motion video[autoplay] {
        animation-play-state: paused !important;
      }

      /* Respect prefers-reduced-motion */
      @media (prefers-reduced-motion: reduce) {
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;

    style.textContent = motionStyles;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById('a11y-reduced-motion-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [settings.reducedMotion]);

  return (
    <>
      {children || (
        <button
          onClick={toggleReducedMotion}
          aria-pressed={settings.reducedMotion}
          className="a11y-control-button"
          title={settings.reducedMotion ? 'Enable animations' : 'Reduce motion'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {settings.reducedMotion ? (
              <path
                d="M10 4V16M4 10H16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8L10 2Z" fill="currentColor" />
            )}
          </svg>
          <span className="sr-only">
            {settings.reducedMotion ? 'Enable animations' : 'Reduce motion'}
          </span>
        </button>
      )}
    </>
  );
}
