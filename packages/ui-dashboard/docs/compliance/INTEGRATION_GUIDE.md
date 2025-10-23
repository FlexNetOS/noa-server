# Accessibility Integration Guide

This guide shows how to integrate the accessibility features into your existing UI Dashboard components.

## 1. Wrap Your App with AccessibilityProvider

```tsx
// src/main.tsx or src/App.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccessibilityProvider } from './accessibility';
import { SkipLinks } from './accessibility/components/SkipLinks';
import { FocusOutline } from './accessibility/components/FocusOutline';
import { AriaAnnouncer } from './accessibility/components/AriaAnnouncer';
import { A11yControls } from './accessibility/components/A11yControls';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <SkipLinks />
      <FocusOutline />
      <AriaAnnouncer />
      <A11yControls position="top-right" />
      <App />
    </AccessibilityProvider>
  </StrictMode>
);
```

## 2. Update App.tsx Structure

```tsx
// src/App.tsx
import { useEffect } from 'react';
import { Header } from './components/Header';
import { useScreenReader } from './accessibility';

export default function App() {
  const { announceNavigation } = useScreenReader();

  useEffect(() => {
    // Set page title
    document.title = 'Noa Server Dashboard';
    announceNavigation('Dashboard');
  }, []);

  return (
    <div className="app">
      {/* Skip links target */}
      <a id="skip-to-main" className="sr-only" />

      <Header />

      <nav id="navigation" aria-label="Main navigation">
        {/* Navigation content */}
      </nav>

      <main id="main-content" tabIndex={-1}>
        <h1>Dashboard</h1>
        {/* Main content */}
      </main>

      <footer id="footer">
        {/* Footer content */}
      </footer>
    </div>
  );
}
```

## 3. Update MetricCard Component

```tsx
// src/components/MetricCard.tsx
import { motion } from 'framer-motion';
import { useReducedMotion } from '../accessibility';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  status?: 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  status,
  className = ''
}: MetricCardProps) {
  const reducedMotion = useReducedMotion();

  const statusColors = {
    success: 'border-brand-success/30 bg-brand-success/5',
    warning: 'border-brand-warning/30 bg-brand-warning/5',
    danger: 'border-brand-danger/30 bg-brand-danger/5',
    info: 'border-brand-info/30 bg-brand-info/5'
  };

  // Generate accessible label
  const ariaLabel = `${title}: ${value}${
    subtitle ? `, ${subtitle}` : ''
  }${
    trend ? `, ${trend.isPositive ? 'up' : 'down'} ${Math.abs(trend.value)} percent` : ''
  }`;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.3 }}
      className={`
        bg-brand-card
        border border-brand-border
        rounded-lg p-6
        ${status ? statusColors[status] : ''}
        ${className}
      `}
      role="article"
      aria-label={ariaLabel}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-brand-muted uppercase tracking-wide">
          {title}
        </h3>
        {icon && (
          <div className="text-brand-accent" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white mb-1" aria-live="polite">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-brand-muted">{subtitle}</p>
          )}
        </div>

        {trend && (
          <div
            className={`
              flex items-center text-sm font-medium
              ${trend.isPositive ? 'text-brand-success' : 'text-brand-danger'}
            `}
            aria-label={`Trend: ${trend.isPositive ? 'increasing' : 'decreasing'} by ${Math.abs(trend.value)} percent`}
          >
            <span className="mr-1" aria-hidden="true">
              {trend.isPositive ? '↑' : '↓'}
            </span>
            <span className="sr-only">
              {trend.isPositive ? 'Increasing' : 'Decreasing'} by
            </span>
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

## 4. Add Keyboard Navigation to Tables

```tsx
// src/pages/users/UserManagement.tsx
import { useRef } from 'react';
import { useRovingTabIndex } from '../../accessibility';

export function UserManagement() {
  const tableRef = useRef<HTMLTableElement>(null);

  // Enable keyboard navigation for table rows
  useRovingTabIndex(tableRef, 'tr[role="row"]', {
    orientation: 'vertical',
    loop: true,
  });

  return (
    <div>
      <h1>User Management</h1>
      <table ref={tableRef} role="table" aria-label="User list">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col" aria-sort="none">
              Role
            </th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr role="row" tabIndex={0}>
            <td>John Doe</td>
            <td>john@example.com</td>
            <td>Admin</td>
            <td>
              <button aria-label="Edit John Doe">Edit</button>
              <button aria-label="Delete John Doe">Delete</button>
            </td>
          </tr>
          {/* More rows */}
        </tbody>
      </table>
    </div>
  );
}
```

## 5. Add Screen Reader Announcements

```tsx
// src/pages/monitoring/SystemHealth.tsx
import { useEffect, useState } from 'react';
import { useScreenReader } from '../../accessibility';

export function SystemHealth() {
  const [status, setStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const { announceStatus, announceError } = useScreenReader();

  useEffect(() => {
    // Announce status changes
    const statusMessages = {
      healthy: 'System is healthy',
      warning: 'System warning detected',
      critical: 'Critical system error',
    };

    if (status === 'critical') {
      announceError(statusMessages[status]);
    } else {
      announceStatus(statusMessages[status]);
    }
  }, [status, announceStatus, announceError]);

  return (
    <div role="region" aria-label="System health status">
      <h2>System Health</h2>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`status-indicator status-${status}`}
      >
        <span className="sr-only">System status: </span>
        {status}
      </div>
    </div>
  );
}
```

## 6. Add Focus Management to Modals

```tsx
// src/components/Modal.tsx
import { useEffect } from 'react';
import { useFocusTrap } from '../accessibility';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>({
    enabled: isOpen,
    onEscape: onClose,
    returnFocus: true,
  });

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="modal-close"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
```

## 7. Add ARIA to Charts

```tsx
// src/pages/monitoring/MetricsChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function MetricsChart({ data }: { data: any[] }) {
  const dataDescription = `Chart showing ${data.length} data points.
    Minimum value: ${Math.min(...data.map(d => d.value))}.
    Maximum value: ${Math.max(...data.map(d => d.value))}.`;

  return (
    <div role="region" aria-label="Metrics chart">
      <h2>System Metrics</h2>

      {/* Visual chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          aria-label="Line chart of system metrics"
          aria-describedby="chart-description"
        >
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>

      {/* Hidden description for screen readers */}
      <p id="chart-description" className="sr-only">
        {dataDescription}
      </p>

      {/* Alternative data table */}
      <details className="mt-4">
        <summary>View data table</summary>
        <table>
          <caption>Metrics data</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{row.time}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
```

## 8. Add CSS for Accessibility

```css
/* src/index.css */

/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Focus visible styles */
:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}

/* Keyboard-only mode enhancement */
.keyboard-only :focus {
  outline: 3px solid #3b82f6;
  outline-offset: 3px;
}

/* High contrast mode */
.high-contrast {
  --bg-primary: #000000;
  --text-primary: #ffffff;
  --border-color: #ffffff;
}

/* Reduced motion */
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* Respect system preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 9. Testing Your Components

```tsx
// src/components/__tests__/MetricCard.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibilityProvider } from '../../accessibility';
import { MetricCard } from '../MetricCard';

expect.extend(toHaveNoViolations);

describe('MetricCard Accessibility', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <AccessibilityProvider>
        <MetricCard
          title="Active Users"
          value={1234}
          subtitle="Last 24 hours"
          trend={{ value: 12, isPositive: true }}
        />
      </AccessibilityProvider>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels', () => {
    const { getByRole } = render(
      <AccessibilityProvider>
        <MetricCard
          title="Active Users"
          value={1234}
        />
      </AccessibilityProvider>
    );

    const article = getByRole('article');
    expect(article).toHaveAttribute('aria-label');
  });
});
```

## 10. Running Accessibility Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run accessibility tests only
npm run test:a11y

# Run Lighthouse CI
npm run lighthouse

# Run ESLint with accessibility rules
npm run lint:a11y

# Watch mode for development
npm run test:watch
```

## Best Practices

### 1. Always Use Semantic HTML
```tsx
// ✅ Good
<button onClick={handleClick}>Click me</button>

// ❌ Bad
<div onClick={handleClick}>Click me</div>
```

### 2. Provide Text Alternatives
```tsx
// ✅ Good
<img src="chart.png" alt="Sales increased by 25% this quarter" />

// ❌ Bad
<img src="chart.png" />
```

### 3. Use ARIA Appropriately
```tsx
// ✅ Good - ARIA enhances semantic HTML
<button aria-label="Close dialog">×</button>

// ❌ Bad - Unnecessary ARIA
<button role="button" aria-label="Submit">Submit</button>
```

### 4. Manage Focus
```tsx
// ✅ Good - Return focus after modal closes
const modalRef = useFocusTrap({ returnFocus: true });

// ❌ Bad - Focus lost
// No focus management
```

### 5. Announce Dynamic Changes
```tsx
// ✅ Good
const { announceStatus } = useScreenReader();
announceStatus('Data loaded successfully');

// ❌ Bad
// Silent updates
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Accessibility Documentation](./ACCESSIBILITY.md)
- [Component Audit Results](../../src/accessibility/utils/componentAudits.ts)

## Support

For questions about accessibility integration:
- Check the [FAQ](./ACCESSIBILITY_FAQ.md)
- Review [component examples](../../src/accessibility/components/)
- Contact accessibility@noa-server.io
