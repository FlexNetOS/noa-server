# Accessibility Module

Complete WCAG 2.1 Level AA accessibility infrastructure for the Noa Server UI Dashboard.

## Overview

This module provides a comprehensive set of tools, hooks, and components to ensure full accessibility compliance and an excellent user experience for all users, including those using assistive technologies.

## Features

- **WCAG 2.1 Level AA Compliant**: 100% compliance with all applicable success criteria
- **Screen Reader Support**: Full support for NVDA, JAWS, VoiceOver, TalkBack, and Narrator
- **Keyboard Navigation**: All functionality accessible via keyboard
- **High Contrast Mode**: Toggle for maximum visibility
- **Font Scaling**: Resize text from 100% to 200%
- **Reduced Motion**: Respects user motion preferences
- **Focus Management**: Focus trap for modals, visible focus indicators
- **ARIA Announcements**: Live regions for dynamic content updates

## Installation

The accessibility module is part of the UI Dashboard package. No additional installation required.

## Quick Start

### 1. Wrap Your App

```tsx
import { AccessibilityProvider } from './accessibility';
import { SkipLinks, FocusOutline, AriaAnnouncer, A11yControls } from './accessibility';

function App() {
  return (
    <AccessibilityProvider>
      <SkipLinks />
      <FocusOutline />
      <AriaAnnouncer />
      <A11yControls />
      <YourAppContent />
    </AccessibilityProvider>
  );
}
```

### 2. Use Hooks

```tsx
import { useScreenReader, useKeyboardNav, useFocusTrap } from './accessibility';

function MyComponent() {
  const { announce } = useScreenReader();
  const modalRef = useFocusTrap({ enabled: isOpen });

  const handleAction = () => {
    // Do something
    announce('Action completed successfully');
  };

  return <div ref={modalRef}>...</div>;
}
```

## Components

### AccessibilityProvider

Global provider that manages accessibility settings and context.

```tsx
<AccessibilityProvider>
  <App />
</AccessibilityProvider>
```

### SkipLinks

Provides skip navigation links for keyboard users.

```tsx
<SkipLinks />
```

Default skip links:
- Skip to main content
- Skip to navigation
- Skip to search
- Skip to footer

### A11yControls

Floating accessibility control panel.

```tsx
<A11yControls position="top-right" />
```

Features:
- Font size adjustment
- High contrast toggle
- Reduced motion toggle
- Settings reset

### FocusOutline

Adds global focus indicator styles.

```tsx
<FocusOutline />
```

### HighContrast

High contrast mode component.

```tsx
<HighContrast />
```

### FontSizeControls

Font size adjustment controls.

```tsx
<FontSizeControls
  orientation="horizontal"
  showLabels={true}
/>
```

### ReducedMotion

Reduced motion toggle.

```tsx
<ReducedMotion />
```

### AriaAnnouncer

Global ARIA announcer for screen reader messages.

```tsx
<AriaAnnouncer />
```

## Hooks

### useAccessibility

Main hook for accessing accessibility context.

```tsx
const { settings, updateSettings, announce, resetSettings } = useAccessibility();

// Update settings
updateSettings({ fontSize: 125, highContrast: true });

// Announce message
announce('Data loaded successfully', 'polite');

// Reset all settings
resetSettings();
```

### useFocusTrap

Trap focus within a container (for modals, dialogs).

```tsx
const modalRef = useFocusTrap({
  enabled: isOpen,
  onEscape: handleClose,
  returnFocus: true,
});

<div ref={modalRef} role="dialog">
  {/* Modal content */}
</div>
```

### useKeyboardNav

Handle keyboard navigation.

```tsx
const containerRef = useRef<HTMLDivElement>(null);

useKeyboardNav(containerRef, {
  onArrowDown: () => selectNext(),
  onArrowUp: () => selectPrevious(),
  onEnter: () => activate(),
  onEscape: () => close(),
});

<div ref={containerRef}>
  {/* Content */}
</div>
```

### useRovingTabIndex

Roving tabindex for lists and menus.

```tsx
const listRef = useRef<HTMLUListElement>(null);

useRovingTabIndex(listRef, 'li[role="option"]', {
  orientation: 'vertical',
  loop: true,
});

<ul ref={listRef} role="listbox">
  <li role="option" tabIndex={0}>Item 1</li>
  <li role="option" tabIndex={-1}>Item 2</li>
</ul>
```

### useScreenReader

Screen reader announcements.

```tsx
const {
  announce,
  announceStatus,
  announceError,
  announceSuccess,
  announceNavigation,
} = useScreenReader();

// Announce status change
announceStatus('Data loaded');

// Announce error
announceError('Failed to save');

// Announce success
announceSuccess('Saved successfully');

// Announce navigation
announceNavigation('Settings page');
```

### useLiveRegion

ARIA live region management.

```tsx
const { announce } = useLiveRegion({
  politeness: 'polite',
  atomic: true,
});

announce('5 new notifications');
```

### useProgressAnnouncement

Announce progress at intervals.

```tsx
const { announceProgress, reset } = useProgressAnnouncement([0, 25, 50, 75, 100]);

// Announce at thresholds
announceProgress(45, 'Upload'); // Announces "Upload: 25% complete"
announceProgress(78, 'Upload'); // Announces "Upload: 75% complete"
```

### Convenience Hooks

```tsx
// Check if reduced motion is enabled
const isReducedMotion = useReducedMotion();

// Check if high contrast is enabled
const isHighContrast = useHighContrast();

// Get current font size
const fontSize = useFontSize();

// Check if keyboard-only mode is active
const isKeyboardOnly = useKeyboardOnly();
```

## Theme

Accessibility theme with WCAG-compliant colors.

```tsx
import { a11yTheme, generateCSSVariables } from './accessibility';

// Use theme values
const color = a11yTheme.colors.interactive.primary; // #3b82f6

// Generate CSS variables
const cssVars = generateCSSVariables();
```

### Color Contrast Ratios

All colors meet WCAG AA requirements:

- **Text colors**: 4.5:1 minimum (21:1 for white on dark)
- **UI components**: 3:1 minimum
- **High contrast**: Maximum contrast (21:1)

### Touch Targets

Minimum touch target sizes:

- **Minimum**: 44x44px (WCAG 2.5.5)
- **Comfortable**: 48x48px
- **Large**: 56x56px

## Utilities

### Component Audits

Identify and fix accessibility issues.

```tsx
import {
  componentAuditResults,
  getIssuesBySeverity,
  generateAuditReport,
} from './accessibility';

// Get critical issues
const criticalIssues = getIssuesBySeverity('critical');

// Generate audit report
const report = generateAuditReport();
console.log(report);
```

### Utility Functions

```tsx
import { announce } from './accessibility/components/AriaAnnouncer';

// Announce from anywhere in your app
announce('Message', 'polite');
```

## Testing

### Automated Testing

```bash
# Run all accessibility tests
npm run test:a11y

# Run Lighthouse CI
npm run lighthouse

# Run ESLint with accessibility rules
npm run lint:a11y
```

### Unit Testing with Jest Axe

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AccessibilityProvider } from './accessibility';

expect.extend(toHaveNoViolations);

test('component has no accessibility violations', async () => {
  const { container } = render(
    <AccessibilityProvider>
      <YourComponent />
    </AccessibilityProvider>
  );

  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Best Practices

### 1. Use Semantic HTML

```tsx
// ✅ Good
<button onClick={handleClick}>Submit</button>
<nav aria-label="Main">...</nav>
<main>...</main>

// ❌ Bad
<div onClick={handleClick}>Submit</div>
<div>...</div>
```

### 2. Provide ARIA Labels

```tsx
// ✅ Good
<button aria-label="Close dialog">×</button>
<img src="chart.png" alt="Sales chart showing 25% increase" />

// ❌ Bad
<button>×</button>
<img src="chart.png" />
```

### 3. Manage Focus

```tsx
// ✅ Good
const modalRef = useFocusTrap({ returnFocus: true });

// ❌ Bad
// No focus management
```

### 4. Announce Changes

```tsx
// ✅ Good
const { announceStatus } = useScreenReader();
announceStatus('Data refreshed');

// ❌ Bad
// Silent update
```

### 5. Support Keyboard Navigation

```tsx
// ✅ Good
<button onClick={handleClick}>Action</button>

// ❌ Bad
<div onClick={handleClick}>Action</div>
```

## Keyboard Shortcuts

Global shortcuts available:

- **Tab**: Navigate forward
- **Shift+Tab**: Navigate backward
- **Enter/Space**: Activate buttons
- **Escape**: Close modals
- **Arrow keys**: Navigate lists/menus
- **Home/End**: Jump to first/last item

## Browser Support

Tested and supported:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Screen Reader Support

Full support for:

- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS, iOS)
- **TalkBack** (Android)
- **Narrator** (Windows)

## File Structure

```
src/accessibility/
├── AccessibilityProvider.tsx    # Main provider
├── index.ts                      # Exports
├── components/
│   ├── SkipLinks.tsx
│   ├── FocusOutline.tsx
│   ├── HighContrast.tsx
│   ├── FontSizeControls.tsx
│   ├── ReducedMotion.tsx
│   ├── AriaAnnouncer.tsx
│   └── A11yControls.tsx
├── hooks/
│   ├── useAccessibility.ts
│   ├── useFocusTrap.ts
│   ├── useKeyboardNav.ts
│   ├── useScreenReader.ts
│   └── useLiveRegion.ts
└── utils/
    └── componentAudits.ts

src/theme/
└── accessibility.ts              # Theme configuration

tests/accessibility/
├── axe.test.tsx
├── keyboard-nav.test.tsx
├── contrast.test.ts
└── wcag-checklist.test.tsx

docs/compliance/
├── ACCESSIBILITY.md
├── ACCESSIBILITY_STATEMENT.md
├── INTEGRATION_GUIDE.md
└── IMPLEMENTATION_SUMMARY.md
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Full Documentation](../../../docs/compliance/ACCESSIBILITY.md)
- [Integration Guide](../../../docs/compliance/INTEGRATION_GUIDE.md)

## Contributing

When adding new components:

1. Use semantic HTML
2. Add proper ARIA attributes
3. Ensure keyboard accessibility
4. Test with screen readers
5. Write accessibility tests
6. Update documentation

## License

Part of the Noa Server UI Dashboard project.

## Support

For accessibility issues or questions:
- **Email**: accessibility@noa-server.io
- **Documentation**: [/docs/compliance/ACCESSIBILITY.md](../../../docs/compliance/ACCESSIBILITY.md)
- **GitHub Issues**: Tag with [a11y]
