import { useAccessibility } from '../hooks/useAccessibility';

const fontSizes = [
  { value: 100, label: 'Normal (100%)' },
  { value: 125, label: 'Large (125%)' },
  { value: 150, label: 'Larger (150%)' },
  { value: 200, label: 'Largest (200%)' },
];

interface FontSizeControlsProps {
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  className?: string;
}

/**
 * Font size adjustment controls
 * Meets WCAG 1.4.4 Resize Text requirement
 */
export function FontSizeControls({
  orientation = 'horizontal',
  showLabels = true,
  className = '',
}: FontSizeControlsProps) {
  const { settings, updateSettings } = useAccessibility();

  const increaseFontSize = () => {
    const currentIndex = fontSizes.findIndex((f) => f.value === settings.fontSize);
    if (currentIndex < fontSizes.length - 1) {
      updateSettings({ fontSize: fontSizes[currentIndex + 1].value });
    }
  };

  const decreaseFontSize = () => {
    const currentIndex = fontSizes.findIndex((f) => f.value === settings.fontSize);
    if (currentIndex > 0) {
      updateSettings({ fontSize: fontSizes[currentIndex - 1].value });
    }
  };

  const resetFontSize = () => {
    updateSettings({ fontSize: 100 });
  };

  const currentLabel = fontSizes.find((f) => f.value === settings.fontSize)?.label || 'Normal';
  const canDecrease = settings.fontSize > fontSizes[0].value;
  const canIncrease = settings.fontSize < fontSizes[fontSizes.length - 1].value;

  return (
    <div
      className={`font-size-controls ${orientation} ${className}`}
      role="group"
      aria-label="Font size controls"
    >
      <button
        onClick={decreaseFontSize}
        disabled={!canDecrease}
        aria-label="Decrease font size"
        title="Decrease font size"
        className="font-size-button"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {showLabels && <span>A-</span>}
      </button>

      <span className="font-size-label" aria-live="polite">
        {currentLabel}
      </span>

      <button
        onClick={increaseFontSize}
        disabled={!canIncrease}
        aria-label="Increase font size"
        title="Increase font size"
        className="font-size-button"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {showLabels && <span>A+</span>}
      </button>

      {settings.fontSize !== 100 && (
        <button
          onClick={resetFontSize}
          aria-label="Reset font size to normal"
          title="Reset font size"
          className="font-size-button reset"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16M4 10L6 8M4 10L6 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {showLabels && <span>Reset</span>}
        </button>
      )}

      <style>{`
        .font-size-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .font-size-controls.vertical {
          flex-direction: column;
        }

        .font-size-button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          background: transparent;
          border: 1px solid currentColor;
          border-radius: 0.375rem;
          color: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .font-size-button:hover:not(:disabled) {
          background: rgba(59, 130, 246, 0.1);
          border-color: #3b82f6;
        }

        .font-size-button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .font-size-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .font-size-button.reset {
          border-color: #ef4444;
          color: #ef4444;
        }

        .font-size-label {
          font-size: 0.875rem;
          font-weight: 500;
          min-width: 100px;
          text-align: center;
        }

        /* High contrast mode */
        .high-contrast .font-size-button {
          border-width: 2px;
        }

        .high-contrast .font-size-button:hover:not(:disabled) {
          background: #ffffff;
          color: #000000;
        }
      `}</style>
    </div>
  );
}
