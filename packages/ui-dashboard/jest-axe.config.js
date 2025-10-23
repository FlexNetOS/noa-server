/**
 * Jest Axe Configuration
 * Configures axe-core for automated accessibility testing
 */

module.exports = {
  // Global axe configuration
  axeConfig: {
    rules: [
      // WCAG 2.1 Level A rules
      { id: 'area-alt', enabled: true },
      { id: 'aria-allowed-attr', enabled: true },
      { id: 'aria-allowed-role', enabled: true },
      { id: 'aria-hidden-body', enabled: true },
      { id: 'aria-hidden-focus', enabled: true },
      { id: 'aria-input-field-name', enabled: true },
      { id: 'aria-meter-name', enabled: true },
      { id: 'aria-progressbar-name', enabled: true },
      { id: 'aria-required-attr', enabled: true },
      { id: 'aria-required-children', enabled: true },
      { id: 'aria-required-parent', enabled: true },
      { id: 'aria-roledescription', enabled: true },
      { id: 'aria-roles', enabled: true },
      { id: 'aria-toggle-field-name', enabled: true },
      { id: 'aria-tooltip-name', enabled: true },
      { id: 'aria-valid-attr', enabled: true },
      { id: 'aria-valid-attr-value', enabled: true },
      { id: 'button-name', enabled: true },
      { id: 'bypass', enabled: true },
      { id: 'color-contrast', enabled: true },
      { id: 'document-title', enabled: true },
      { id: 'duplicate-id-aria', enabled: true },
      { id: 'duplicate-id-active', enabled: true },
      { id: 'form-field-multiple-labels', enabled: true },
      { id: 'frame-title', enabled: true },
      { id: 'heading-order', enabled: true },
      { id: 'html-has-lang', enabled: true },
      { id: 'html-lang-valid', enabled: true },
      { id: 'image-alt', enabled: true },
      { id: 'input-button-name', enabled: true },
      { id: 'input-image-alt', enabled: true },
      { id: 'label', enabled: true },
      { id: 'link-name', enabled: true },
      { id: 'list', enabled: true },
      { id: 'listitem', enabled: true },
      { id: 'meta-viewport', enabled: true },
      { id: 'object-alt', enabled: true },
      { id: 'role-img-alt', enabled: true },
      { id: 'scrollable-region-focusable', enabled: true },
      { id: 'select-name', enabled: true },
      { id: 'svg-img-alt', enabled: true },
      { id: 'td-headers-attr', enabled: true },
      { id: 'th-has-data-cells', enabled: true },
      { id: 'valid-lang', enabled: true },
      { id: 'video-caption', enabled: true },

      // WCAG 2.1 Level AA rules
      { id: 'autocomplete-valid', enabled: true },
      { id: 'avoid-inline-spacing', enabled: true },

      // Best practices
      { id: 'accesskeys', enabled: true },
      { id: 'aria-treeitem-name', enabled: true },
      { id: 'empty-heading', enabled: true },
      { id: 'frame-title-unique', enabled: true },
      { id: 'identical-links-same-purpose', enabled: true },
      { id: 'label-content-name-mismatch', enabled: true },
      { id: 'landmark-banner-is-top-level', enabled: true },
      { id: 'landmark-complementary-is-top-level', enabled: true },
      { id: 'landmark-contentinfo-is-top-level', enabled: true },
      { id: 'landmark-main-is-top-level', enabled: true },
      { id: 'landmark-no-duplicate-banner', enabled: true },
      { id: 'landmark-no-duplicate-contentinfo', enabled: true },
      { id: 'landmark-no-duplicate-main', enabled: true },
      { id: 'landmark-one-main', enabled: true },
      { id: 'landmark-unique', enabled: true },
      { id: 'meta-refresh', enabled: true },
      { id: 'page-has-heading-one', enabled: true },
      { id: 'region', enabled: true },
      { id: 'skip-link', enabled: true },
      { id: 'tabindex', enabled: true },
    ],

    // Rules to disable (if any)
    disabledRules: [],

    // Tags to run
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    },

    // Element to exclude from testing
    exclude: [
      ['#webpack-dev-server-client-overlay'],
      ['#webpack-dev-server-client-overlay-div'],
    ],

    // Options
    resultTypes: ['violations', 'incomplete'],
    reporter: 'v2',
    iframes: true,
    frameWaitTime: 9000,
    preload: true,
    performanceTimer: false,
  },

  // Jest matchers configuration
  matchers: {
    toHaveNoViolations: {
      // Only fail on critical violations
      failOn: 'violation',
    },
  },

  // Custom rules (optional)
  customRules: [],

  // Environment-specific settings
  environments: {
    development: {
      // More lenient in development
      failOn: 'violation',
      skipIncomplete: true,
    },
    ci: {
      // Strict in CI
      failOn: 'violation',
      skipIncomplete: false,
    },
    production: {
      // Very strict in production
      failOn: 'violation',
      skipIncomplete: false,
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
    },
  },
};
