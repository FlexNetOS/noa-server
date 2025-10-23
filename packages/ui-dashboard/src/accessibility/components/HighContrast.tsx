import { useAccessibility } from '../hooks/useAccessibility';

interface HighContrastProps {
  children?: React.ReactNode;
}

/**
 * High contrast mode component
 * Meets WCAG 1.4.3 Contrast (Minimum) and 1.4.11 Non-text Contrast
 */
export function HighContrast({ children }: HighContrastProps) {
  const { settings, updateSettings } = useAccessibility();

  const toggleHighContrast = () => {
    updateSettings({ highContrast: !settings.highContrast });
  };

  return (
    <>
      {children || (
        <button
          onClick={toggleHighContrast}
          aria-pressed={settings.highContrast}
          className="a11y-control-button"
          title={settings.highContrast ? 'Disable high contrast' : 'Enable high contrast'}
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
              d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 4V16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4Z"
              fill="currentColor"
            />
          </svg>
          <span className="sr-only">
            {settings.highContrast ? 'Disable high contrast' : 'Enable high contrast'}
          </span>
        </button>
      )}

      <style>{`
        /* High contrast mode styles */
        .high-contrast {
          --bg-primary: #000000;
          --bg-secondary: #1a1a1a;
          --bg-card: #0a0a0a;
          --text-primary: #ffffff;
          --text-secondary: #e0e0e0;
          --border-color: #ffffff;
          --accent-color: #ffff00;
          --success-color: #00ff00;
          --warning-color: #ffff00;
          --danger-color: #ff0000;
          --info-color: #00ffff;
        }

        .high-contrast body {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .high-contrast *:not(svg):not(path) {
          border-color: var(--border-color) !important;
        }

        .high-contrast a {
          color: var(--accent-color);
          text-decoration: underline;
        }

        .high-contrast button,
        .high-contrast [role="button"] {
          border: 2px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .high-contrast button:hover,
        .high-contrast [role="button"]:hover {
          background: var(--text-primary);
          color: var(--bg-primary);
        }

        .high-contrast input,
        .high-contrast textarea,
        .high-contrast select {
          border: 2px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .high-contrast .bg-success {
          background: var(--success-color) !important;
          color: var(--bg-primary) !important;
        }

        .high-contrast .bg-warning {
          background: var(--warning-color) !important;
          color: var(--bg-primary) !important;
        }

        .high-contrast .bg-danger {
          background: var(--danger-color) !important;
          color: var(--text-primary) !important;
        }

        .high-contrast .bg-info {
          background: var(--info-color) !important;
          color: var(--bg-primary) !important;
        }

        /* Card components */
        .high-contrast .metric-card,
        .high-contrast .agent-card,
        .high-contrast .workflow-card {
          border: 2px solid var(--border-color);
          background: var(--bg-card);
        }

        /* Charts and visualizations */
        .high-contrast .recharts-surface {
          filter: contrast(1.5) brightness(1.2);
        }

        /* Images */
        .high-contrast img:not([alt]) {
          outline: 2px solid var(--warning-color);
        }

        /* Focus indicators in high contrast */
        .high-contrast :focus {
          outline: 4px solid var(--accent-color);
          outline-offset: 4px;
        }
      `}</style>
    </>
  );
}
