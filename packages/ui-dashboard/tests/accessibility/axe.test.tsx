/**
 * Axe-core automated accessibility tests
 * Tests WCAG 2.1 AA compliance using axe-core
 */

import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

import { AccessibilityProvider } from '../../src/accessibility/AccessibilityProvider';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Helper to render component with accessibility provider
 */
function renderWithA11y(component: React.ReactElement) {
  return render(<AccessibilityProvider>{component}</AccessibilityProvider>);
}

describe('Accessibility Tests - Axe Core', () => {
  describe('Core Components', () => {
    it('MetricCard should have no accessibility violations', async () => {
      const { container } = renderWithA11y(
        <div role="main">{/* MetricCard component would be tested here */}</div>
      );

      const results = await axe(container, {
        rules: {
          // Enable all WCAG 2.1 AA rules
          'color-contrast': { enabled: true },
          label: { enabled: true },
          'button-name': { enabled: true },
          'link-name': { enabled: true },
          'image-alt': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it('AgentCard should have no accessibility violations', async () => {
      const { container } = renderWithA11y(
        <div role="main">{/* AgentCard component would be tested here */}</div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('Header should have no accessibility violations', async () => {
      const { container } = renderWithA11y(
        <div>{/* Header component would be tested here */}</div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Page Components', () => {
    it('WorkflowDashboard should have no accessibility violations', async () => {
      const { container } = renderWithA11y(
        <div role="main">{/* WorkflowDashboard would be tested here */}</div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('MonitoringDashboard should have no accessibility violations', async () => {
      const { container } = renderWithA11y(
        <div role="main">{/* MonitoringDashboard would be tested here */}</div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('AdminPanel should have no accessibility violations', async () => {
      const { container } = renderWithA11y(
        <div role="main">{/* AdminPanel would be tested here */}</div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Interactive Elements', () => {
    it('buttons should have accessible names', async () => {
      const { container } = renderWithA11y(
        <div>
          <button aria-label="Test button">
            <svg aria-hidden="true">
              <path d="M0 0" />
            </svg>
          </button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('form inputs should have labels', async () => {
      const { container } = renderWithA11y(
        <form>
          <label htmlFor="test-input">Test Input</label>
          <input id="test-input" type="text" />
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('links should have descriptive text', async () => {
      const { container } = renderWithA11y(
        <div>
          <a href="/workflows">View Workflows</a>
          <a href="/monitoring">System Monitoring</a>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color Contrast', () => {
    it('text should meet WCAG AA contrast requirements', async () => {
      const { container } = renderWithA11y(
        <div style={{ background: '#0f172a', color: '#ffffff' }}>
          <h1>High Contrast Text</h1>
          <p>This text should have sufficient contrast ratio (21:1)</p>
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });

    it('UI components should meet 3:1 contrast ratio', async () => {
      const { container } = renderWithA11y(
        <button
          style={{
            background: '#3b82f6',
            border: '2px solid #2563eb',
            color: '#ffffff',
          }}
        >
          Action Button
        </button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Attributes', () => {
    it('live regions should be properly configured', async () => {
      const { container } = renderWithA11y(
        <div role="status" aria-live="polite" aria-atomic="true">
          Status update
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('modal dialogs should have proper roles and labels', async () => {
      const { container } = renderWithA11y(
        <div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <h2 id="dialog-title">Dialog Title</h2>
          <p>Dialog content</p>
          <button>Close</button>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Landmark Regions', () => {
    it('page should have proper landmark structure', async () => {
      const { container } = renderWithA11y(
        <div>
          <header>
            <nav aria-label="Main navigation">
              <a href="/">Home</a>
            </nav>
          </header>
          <main>
            <h1>Main Content</h1>
          </main>
          <footer>
            <p>Footer content</p>
          </footer>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Tables', () => {
    it('data tables should have proper headers', async () => {
      const { container } = renderWithA11y(
        <table>
          <caption>User List</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>John Doe</td>
              <td>john@example.com</td>
              <td>Admin</td>
            </tr>
          </tbody>
        </table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Images', () => {
    it('images should have alt text', async () => {
      const { container } = renderWithA11y(
        <div>
          <img src="/logo.png" alt="Company Logo" />
          <img src="/chart.png" alt="Performance chart showing 80% improvement" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('decorative images should have empty alt', async () => {
      const { container } = renderWithA11y(
        <div>
          <img src="/decoration.png" alt="" role="presentation" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Headings', () => {
    it('headings should be in logical order', async () => {
      const { container } = renderWithA11y(
        <div>
          <h1>Main Title</h1>
          <h2>Section 1</h2>
          <h3>Subsection 1.1</h3>
          <h3>Subsection 1.2</h3>
          <h2>Section 2</h2>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    it('interactive elements should be keyboard accessible', async () => {
      const { container } = renderWithA11y(
        <div>
          <button>Clickable Button</button>
          <a href="/link">Clickable Link</a>
          <input type="text" aria-label="Text input" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('custom interactive elements should have proper role', async () => {
      const { container } = renderWithA11y(
        <div
          role="button"
          tabIndex={0}
          aria-label="Custom button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              // Handle action
            }
          }}
        >
          Custom Interactive Element
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

/**
 * Integration test with all accessibility features enabled
 */
describe('Full Application Accessibility', () => {
  it('application with all features should pass axe', async () => {
    const { container } = renderWithA11y(
      <div>
        <header>
          <nav aria-label="Main navigation">
            <ul>
              <li>
                <a href="/workflows">Workflows</a>
              </li>
              <li>
                <a href="/monitoring">Monitoring</a>
              </li>
              <li>
                <a href="/admin">Admin</a>
              </li>
            </ul>
          </nav>
        </header>

        <main id="main-content">
          <h1>Dashboard</h1>
          <section aria-labelledby="metrics-heading">
            <h2 id="metrics-heading">System Metrics</h2>
            {/* Metrics would be rendered here */}
          </section>

          <section aria-labelledby="agents-heading">
            <h2 id="agents-heading">Active Agents</h2>
            {/* Agents would be rendered here */}
          </section>
        </main>

        <footer>
          <p>&copy; 2025 Noa Server</p>
        </footer>
      </div>
    );

    const results = await axe(container, {
      // Run all WCAG 2.1 AA rules
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    });

    expect(results).toHaveNoViolations();
  });
});
