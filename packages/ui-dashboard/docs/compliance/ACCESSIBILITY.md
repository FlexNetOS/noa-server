# Accessibility Documentation - WCAG 2.1 Level AA

## Overview

This document describes the accessibility features and compliance status of the
Noa Server UI Dashboard. We are committed to ensuring our platform is accessible
to all users, including those using assistive technologies.

## Compliance Status

**Conformance Level**: WCAG 2.1 Level AA

**Date**: January 2025

**Scope**: All pages and features of the UI Dashboard

**Status**: ✅ Compliant

## Standards and Guidelines

We follow these accessibility standards:

- **WCAG 2.1 Level AA** - Web Content Accessibility Guidelines
- **Section 508** - U.S. Federal accessibility standards
- **ARIA 1.2** - Accessible Rich Internet Applications

## Accessibility Features

### 1. Keyboard Navigation

All interactive elements are fully keyboard accessible:

- **Tab**: Navigate forward through interactive elements
- **Shift+Tab**: Navigate backward
- **Enter/Space**: Activate buttons and links
- **Arrow Keys**: Navigate within menus, lists, and tables
- **Escape**: Close modals and dropdowns
- **Home/End**: Jump to first/last items in lists

**Skip Links** are provided to bypass navigation:

- Skip to main content
- Skip to navigation
- Skip to search
- Skip to footer

### 2. Screen Reader Support

Compatible with major screen readers:

- **NVDA** (Windows)
- **JAWS** (Windows)
- **VoiceOver** (macOS, iOS)
- **TalkBack** (Android)
- **Narrator** (Windows)

**Features**:

- Semantic HTML for proper document structure
- ARIA labels and descriptions for complex components
- Live regions for dynamic content updates
- Status messages announced automatically
- Alternative text for all images

### 3. Visual Accessibility

#### Color Contrast

All text and UI components meet WCAG AA requirements:

- **Normal Text**: 4.5:1 contrast ratio minimum
- **Large Text** (18pt+): 3:1 contrast ratio minimum
- **UI Components**: 3:1 contrast ratio minimum

#### High Contrast Mode

Toggle high contrast mode for maximum visibility:

- Black background (#000000)
- White text (#FFFFFF)
- Yellow accents (#FFFF00) for maximum contrast
- Bold borders and focus indicators

#### Font Sizing

Adjust text size from 100% to 200%:

- **Normal** (100%): Default size
- **Large** (125%): 25% larger
- **Larger** (150%): 50% larger
- **Largest** (200%): Double size

All layouts reflow properly at all zoom levels.

### 4. Motion and Animation

**Reduced Motion** mode respects user preferences:

- Detects `prefers-reduced-motion` system setting
- Manual toggle available
- Disables animations and transitions
- Maintains essential motion for functionality

### 5. Focus Management

Visible focus indicators on all interactive elements:

- **Default**: 2px blue outline with 2px offset
- **Keyboard Mode**: Enhanced 3px outline
- **High Contrast**: 4px yellow outline
- **Focus trap** in modals and dialogs

### 6. Forms and Input

All forms are fully accessible:

- Labels for all input fields
- Error messages in text (not color only)
- Suggestions for fixing errors
- Confirmation before destructive actions
- Autocomplete attributes for common fields
- Clear instructions and help text

### 7. Data Visualization

Charts and graphs are accessible:

- Text alternatives for all visualizations
- Data tables as alternative representation
- High contrast color palettes
- Keyboard navigation for interactive charts
- Screen reader announcements for data

## Component Accessibility

### MetricCard

- ARIA labels describing metrics
- Status indicated by icon + color
- Screen reader announces values and trends
- Keyboard accessible

### WorkflowCanvas

- Keyboard navigation for workflow nodes
- Text description of workflow structure
- Alternative data view available
- ARIA labels for all interactive elements

### MonitoringDashboard

- Real-time updates announced to screen readers
- Chart data available in table format
- Status changes clearly indicated
- Keyboard accessible controls

### AdminPanel

- All forms fully labeled
- Error messages in text
- Confirmation dialogs
- Keyboard shortcuts documented

### UserManagement

- Table keyboard navigation
- Sortable columns with ARIA
- Bulk actions with confirmation
- Clear status indicators

## Testing

### Automated Testing

We use multiple automated testing tools:

- **axe-core**: Comprehensive WCAG validation
- **Lighthouse CI**: Accessibility scoring (>95%)
- **Jest Axe**: Unit test accessibility
- **ESLint jsx-a11y**: Linting for accessibility issues

### Manual Testing

Regular manual testing includes:

- Keyboard-only navigation
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode testing
- Font scaling testing
- Color blindness simulation

### Browser Compatibility

Tested with:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Known Issues

None. All identified accessibility issues have been resolved.

## Keyboard Shortcuts

Global shortcuts:

- **/** or **Ctrl+K**: Focus search
- **Alt+M**: Go to main content
- **Alt+N**: Go to navigation
- **?**: Show keyboard shortcuts help

Component-specific shortcuts are documented in context.

## Assistive Technology Support

### Screen Readers

Full support for:

- Semantic navigation (landmarks, headings)
- Form filling and validation
- Table navigation
- Live updates and notifications
- Modal dialogs and overlays

### Keyboard Navigation

All functionality available via keyboard:

- Navigation through all interactive elements
- Form submission and validation
- Modal and menu interactions
- Data table navigation
- Canvas and visualization controls

### Voice Control

Compatible with voice control software:

- Clear labels for all controls
- Distinct button names
- Voice commands for navigation

## Reporting Issues

If you encounter any accessibility issues:

1. **Email**: accessibility@noa-server.io
2. **GitHub**:
   [Create an issue](https://github.com/noa-server/ui-dashboard/issues)
3. **Support**: Contact our support team

We aim to respond to accessibility issues within 24 hours.

## Continuous Improvement

We continuously improve accessibility:

- Regular audits (quarterly)
- User testing with assistive technology users
- Training for developers on accessibility
- Monitoring of WCAG guideline updates
- Community feedback integration

## Resources

### For Users

- [Keyboard Shortcuts Guide](./KEYBOARD_SHORTCUTS.md)
- [Screen Reader Guide](./SCREEN_READER_GUIDE.md)
- [Customization Options](./CUSTOMIZATION.md)

### For Developers

- [Accessibility Guidelines](./DEVELOPMENT_GUIDELINES.md)
- [Component Patterns](./COMPONENT_PATTERNS.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [ARIA Best Practices](./ARIA_BEST_PRACTICES.md)

## Contact

For questions about accessibility:

- **Email**: accessibility@noa-server.io
- **Documentation**: https://docs.noa-server.io/accessibility
- **Support**: https://support.noa-server.io

---

**Last Updated**: January 2025

**Next Review**: April 2025

**Compliance Officer**: Accessibility Team
