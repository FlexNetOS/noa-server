import { useState } from 'react';

import { FontSizeControls } from './FontSizeControls';
import { HighContrast } from './HighContrast';
import { ReducedMotion } from './ReducedMotion';
import { useAccessibility } from '../hooks/useAccessibility';

interface A11yControlsProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  className?: string;
}

/**
 * Accessibility controls panel
 * Provides quick access to all accessibility features
 */
export function A11yControls({ position = 'top-right', className = '' }: A11yControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, resetSettings } = useAccessibility();

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  const showResetConfirmation = (message: string) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }

    return false;
  };

  const handleReset = () => {
    if (showResetConfirmation('Reset all accessibility settings to defaults?')) {
      resetSettings();
    }
  };

  return (
    <div className={`a11y-controls ${positionClasses[position]} ${className}`}>
      <button
        onClick={togglePanel}
        aria-expanded={isOpen}
        aria-controls="a11y-panel"
        aria-label="Accessibility settings"
        className="a11y-toggle-button"
        title="Accessibility settings"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 2C12.5523 2 13 2.44772 13 3V5C13 5.55228 12.5523 6 12 6C11.4477 6 11 5.55228 11 5V3C11 2.44772 11.4477 2 12 2Z"
            fill="currentColor"
          />
          <path
            d="M12 18C12.5523 18 13 18.4477 13 19V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V19C11 18.4477 11.4477 18 12 18Z"
            fill="currentColor"
          />
          <path
            d="M5 12C5 11.4477 5.44772 11 6 11H8C8.55228 11 9 11.4477 9 12C9 12.5523 8.55228 13 8 13H6C5.44772 13 5 12.5523 5 12Z"
            fill="currentColor"
          />
          <path
            d="M15 12C15 11.4477 15.4477 11 16 11H18C18.5523 11 19 11.4477 19 12C19 12.5523 18.5523 13 18 13H16C15.4477 13 15 12.5523 15 12Z"
            fill="currentColor"
          />
          <path
            d="M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          id="a11y-panel"
          className="a11y-panel"
          role="dialog"
          aria-label="Accessibility settings panel"
        >
          <div className="a11y-panel-header">
            <h2 className="a11y-panel-title">Accessibility Settings</h2>
            <button
              onClick={togglePanel}
              aria-label="Close accessibility settings"
              className="a11y-close-button"
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
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="a11y-panel-content">
            <div className="a11y-setting">
              <span className="a11y-setting-label" role="heading" aria-level={3}>
                Font Size
              </span>
              <FontSizeControls showLabels={true} />
            </div>

            <div className="a11y-setting">
              <span className="a11y-setting-label" role="heading" aria-level={3}>
                Display Mode
              </span>
              <div className="a11y-button-group">
                <HighContrast>
                  <button
                    onClick={() => {}}
                    aria-pressed={settings.highContrast}
                    className="a11y-setting-button"
                  >
                    High Contrast
                  </button>
                </HighContrast>
                <ReducedMotion>
                  <button
                    onClick={() => {}}
                    aria-pressed={settings.reducedMotion}
                    className="a11y-setting-button"
                  >
                    Reduce Motion
                  </button>
                </ReducedMotion>
              </div>
            </div>

            <div className="a11y-setting">
              <span className="a11y-setting-label" role="heading" aria-level={3}>
                Current Settings
              </span>
              <ul className="a11y-status-list">
                <li>Font size: {settings.fontSize}%</li>
                <li>High contrast: {settings.highContrast ? 'On' : 'Off'}</li>
                <li>Reduced motion: {settings.reducedMotion ? 'On' : 'Off'}</li>
                <li>Keyboard mode: {settings.keyboardOnlyMode ? 'Active' : 'Inactive'}</li>
              </ul>
            </div>

            <button onClick={handleReset} className="a11y-reset-button">
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      <style>{`
        .a11y-controls {
          position: fixed;
          z-index: 9998;
        }

        .a11y-toggle-button {
          width: 48px;
          height: 48px;
          padding: 12px;
          background: #1f2937;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .a11y-toggle-button:hover {
          background: #3b82f6;
          transform: scale(1.05);
        }

        .a11y-toggle-button:focus {
          outline: 3px solid #fbbf24;
          outline-offset: 2px;
        }

        .a11y-panel {
          position: absolute;
          top: 60px;
          right: 0;
          width: 320px;
          background: #ffffff;
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .a11y-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
        }

        .a11y-panel-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .a11y-close-button {
          padding: 0.25rem;
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 0.25rem;
        }

        .a11y-close-button:hover {
          color: #111827;
          background: #e5e7eb;
        }

        .a11y-close-button:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .a11y-panel-content {
          padding: 1rem;
          max-height: 500px;
          overflow-y: auto;
        }

        .a11y-setting {
          margin-bottom: 1.5rem;
        }

        .a11y-setting-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .a11y-button-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .a11y-setting-button {
          padding: 0.75rem;
          background: #f3f4f6;
          border: 2px solid #d1d5db;
          border-radius: 0.375rem;
          color: #111827;
          cursor: pointer;
          text-align: left;
          font-weight: 500;
          transition: all 0.2s;
        }

        .a11y-setting-button:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .a11y-setting-button[aria-pressed="true"] {
          background: #3b82f6;
          border-color: #2563eb;
          color: #ffffff;
        }

        .a11y-status-list {
          margin: 0;
          padding-left: 1.5rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .a11y-status-list li {
          margin-bottom: 0.25rem;
        }

        .a11y-reset-button {
          width: 100%;
          padding: 0.75rem;
          background: #ef4444;
          border: none;
          border-radius: 0.375rem;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .a11y-reset-button:hover {
          background: #dc2626;
        }

        .a11y-reset-button:focus {
          outline: 2px solid #fbbf24;
          outline-offset: 2px;
        }

        /* High contrast mode */
        .high-contrast .a11y-panel {
          background: #000000;
          border-color: #ffffff;
        }

        .high-contrast .a11y-panel-header {
          background: #1a1a1a;
          border-bottom-color: #ffffff;
        }

        .high-contrast .a11y-panel-title {
          color: #ffffff;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .a11y-panel {
            background: #1f2937;
            border-color: #374151;
          }

          .a11y-panel-header {
            background: #111827;
            border-bottom-color: #374151;
          }

          .a11y-panel-title {
            color: #f9fafb;
          }

          .a11y-setting-label {
            color: #e5e7eb;
          }

          .a11y-setting-button {
            background: #374151;
            border-color: #4b5563;
            color: #f9fafb;
          }
        }
      `}</style>
    </div>
  );
}
