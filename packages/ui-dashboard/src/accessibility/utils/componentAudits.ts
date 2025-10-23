/**
 * Component accessibility audit utilities
 * Helps identify and fix WCAG 2.1 AA violations
 */

export interface A11yIssue {
  component: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriterion: string;
  issue: string;
  fix: string;
  file?: string;
  line?: number;
}

/**
 * Audit results for existing components
 */
export const componentAuditResults: A11yIssue[] = [
  // MetricCard.tsx
  {
    component: 'MetricCard',
    severity: 'serious',
    wcagCriterion: '4.1.2 Name, Role, Value',
    issue: 'Missing ARIA label for metric card',
    fix: 'Add aria-label describing the metric',
    file: 'src/components/MetricCard.tsx',
    line: 26,
  },
  {
    component: 'MetricCard',
    severity: 'moderate',
    wcagCriterion: '1.4.1 Use of Color',
    issue: 'Status only indicated by color',
    fix: 'Add icon or text indicator alongside color',
    file: 'src/components/MetricCard.tsx',
    line: 18,
  },
  {
    component: 'MetricCard',
    severity: 'minor',
    wcagCriterion: '1.1.1 Non-text Content',
    issue: 'Trend arrows lack text alternative',
    fix: 'Add screen reader text for trend direction',
    file: 'src/components/MetricCard.tsx',
    line: 43,
  },

  // AgentCard.tsx
  {
    component: 'AgentCard',
    severity: 'serious',
    wcagCriterion: '2.1.1 Keyboard',
    issue: 'Interactive elements not keyboard accessible',
    fix: 'Add proper button/link semantics and keyboard handlers',
    file: 'src/components/AgentCard.tsx',
  },
  {
    component: 'AgentCard',
    severity: 'serious',
    wcagCriterion: '4.1.2 Name, Role, Value',
    issue: 'Missing ARIA labels for agent status',
    fix: 'Add aria-label with agent name and status',
    file: 'src/components/AgentCard.tsx',
  },

  // WorkflowDashboard.tsx
  {
    component: 'WorkflowDashboard',
    severity: 'critical',
    wcagCriterion: '2.4.1 Bypass Blocks',
    issue: 'No skip links for main content',
    fix: 'Add SkipLinks component to allow bypassing navigation',
    file: 'src/pages/workflows/WorkflowDashboard.tsx',
  },
  {
    component: 'WorkflowDashboard',
    severity: 'serious',
    wcagCriterion: '2.4.2 Page Titled',
    issue: 'Page lacks descriptive title',
    fix: 'Add document title with useEffect',
    file: 'src/pages/workflows/WorkflowDashboard.tsx',
  },
  {
    component: 'WorkflowDashboard',
    severity: 'moderate',
    wcagCriterion: '3.2.3 Consistent Navigation',
    issue: 'Navigation order inconsistent across pages',
    fix: 'Standardize navigation component order',
    file: 'src/pages/workflows/WorkflowDashboard.tsx',
  },

  // WorkflowCanvas.tsx
  {
    component: 'WorkflowCanvas',
    severity: 'critical',
    wcagCriterion: '2.1.1 Keyboard',
    issue: 'Canvas interactions only work with mouse',
    fix: 'Implement keyboard navigation for workflow nodes',
    file: 'src/pages/workflows/components/WorkflowCanvas.tsx',
  },
  {
    component: 'WorkflowCanvas',
    severity: 'serious',
    wcagCriterion: '1.1.1 Non-text Content',
    issue: 'Visual workflow diagram has no text alternative',
    fix: 'Add aria-describedby with workflow description',
    file: 'src/pages/workflows/components/WorkflowCanvas.tsx',
  },

  // MetricsChart.tsx
  {
    component: 'MetricsChart',
    severity: 'critical',
    wcagCriterion: '1.1.1 Non-text Content',
    issue: 'Charts lack text alternatives for screen readers',
    fix: 'Add data table or detailed description via aria-describedby',
    file: 'src/pages/monitoring/MetricsChart.tsx',
  },
  {
    component: 'MetricsChart',
    severity: 'serious',
    wcagCriterion: '1.4.3 Contrast (Minimum)',
    issue: 'Chart colors may not meet contrast requirements',
    fix: 'Use high-contrast color palette for chart data',
    file: 'src/pages/monitoring/MetricsChart.tsx',
  },

  // SystemHealth.tsx
  {
    component: 'SystemHealth',
    severity: 'serious',
    wcagCriterion: '4.1.3 Status Messages',
    issue: 'Health status changes not announced to screen readers',
    fix: 'Add aria-live region for status updates',
    file: 'src/pages/monitoring/SystemHealth.tsx',
  },

  // AdminPanel.tsx
  {
    component: 'AdminPanel',
    severity: 'serious',
    wcagCriterion: '3.3.2 Labels or Instructions',
    issue: 'Form fields lack proper labels',
    fix: 'Add label elements or aria-label to all inputs',
    file: 'src/pages/admin/AdminPanel.tsx',
  },
  {
    component: 'AdminPanel',
    severity: 'moderate',
    wcagCriterion: '3.3.1 Error Identification',
    issue: 'Form errors not clearly identified',
    fix: 'Add aria-invalid and aria-describedby for errors',
    file: 'src/pages/admin/AdminPanel.tsx',
  },

  // UserManagement.tsx
  {
    component: 'UserManagement',
    severity: 'serious',
    wcagCriterion: '2.4.3 Focus Order',
    issue: 'Table keyboard navigation not logical',
    fix: 'Implement roving tabindex for table rows',
    file: 'src/pages/users/UserManagement.tsx',
  },
  {
    component: 'UserManagement',
    severity: 'moderate',
    wcagCriterion: '4.1.2 Name, Role, Value',
    issue: 'Sortable table columns lack ARIA attributes',
    fix: 'Add aria-sort to indicate sort direction',
    file: 'src/pages/users/UserManagement.tsx',
  },

  // Header.tsx
  {
    component: 'Header',
    severity: 'moderate',
    wcagCriterion: '2.4.4 Link Purpose',
    issue: 'Navigation links lack descriptive text',
    fix: 'Ensure all links have clear, descriptive text',
    file: 'src/components/Header.tsx',
  },
];

/**
 * Get issues by severity
 */
export function getIssuesBySeverity(severity: A11yIssue['severity']): A11yIssue[] {
  return componentAuditResults.filter((issue) => issue.severity === severity);
}

/**
 * Get issues by WCAG criterion
 */
export function getIssuesByCriterion(criterion: string): A11yIssue[] {
  return componentAuditResults.filter((issue) => issue.wcagCriterion.includes(criterion));
}

/**
 * Get issues by component
 */
export function getIssuesByComponent(component: string): A11yIssue[] {
  return componentAuditResults.filter((issue) => issue.component === component);
}

/**
 * Generate audit report
 */
export function generateAuditReport(): string {
  const critical = getIssuesBySeverity('critical');
  const serious = getIssuesBySeverity('serious');
  const moderate = getIssuesBySeverity('moderate');
  const minor = getIssuesBySeverity('minor');

  return `
# Accessibility Audit Report

## Summary
- **Total Issues**: ${componentAuditResults.length}
- **Critical**: ${critical.length}
- **Serious**: ${serious.length}
- **Moderate**: ${moderate.length}
- **Minor**: ${minor.length}

## Critical Issues (Immediate Action Required)
${critical
  .map(
    (issue) => `
### ${issue.component}
- **WCAG**: ${issue.wcagCriterion}
- **Issue**: ${issue.issue}
- **Fix**: ${issue.fix}
- **Location**: ${issue.file}${issue.line ? `:${issue.line}` : ''}
`
  )
  .join('\n')}

## Serious Issues (High Priority)
${serious
  .map(
    (issue) => `
### ${issue.component}
- **WCAG**: ${issue.wcagCriterion}
- **Issue**: ${issue.issue}
- **Fix**: ${issue.fix}
- **Location**: ${issue.file}${issue.line ? `:${issue.line}` : ''}
`
  )
  .join('\n')}

## Moderate Issues (Medium Priority)
${moderate
  .map(
    (issue) => `
### ${issue.component}
- **WCAG**: ${issue.wcagCriterion}
- **Issue**: ${issue.issue}
- **Fix**: ${issue.fix}
- **Location**: ${issue.file}${issue.line ? `:${issue.line}` : ''}
`
  )
  .join('\n')}

## Minor Issues (Low Priority)
${minor
  .map(
    (issue) => `
### ${issue.component}
- **WCAG**: ${issue.wcagCriterion}
- **Issue**: ${issue.issue}
- **Fix**: ${issue.fix}
- **Location**: ${issue.file}${issue.line ? `:${issue.line}` : ''}
`
  )
  .join('\n')}

## Next Steps
1. Fix all critical issues immediately
2. Address serious issues within 1 sprint
3. Plan moderate issues for next 2 sprints
4. Schedule minor issues for ongoing improvements
`;
}

/**
 * Component fix templates
 */
export const componentFixTemplates = {
  addAriaLabel: (label: string) => `aria-label="${label}"`,
  addAriaDescribedBy: (id: string) => `aria-describedby="${id}"`,
  addAriaLive: (politeness: 'polite' | 'assertive' = 'polite') =>
    `aria-live="${politeness}" aria-atomic="true"`,
  addKeyboardHandler: () => `
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAction();
      }
    }}
  `,
  addFocusManagement: () => `
    const elementRef = useRef<HTMLElement>(null);
    useEffect(() => {
      if (shouldFocus) {
        elementRef.current?.focus();
      }
    }, [shouldFocus]);
  `,
};

export default componentAuditResults;
